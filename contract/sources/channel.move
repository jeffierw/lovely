module funs::channel;

use funs::events;
use std::string::{Self, String};
use sui::balance;
use sui::coin::{Self as coin, Coin};
use sui::object::{ID, UID};
use sui::sui::SUI;
use sui::transfer;
use sui::tx_context;
use sui::table;

const E_NOT_OWNER: u64 = 0;
const E_PAYMENT_MISMATCH: u64 = 1;
const E_ALREADY_HAS_CHANNEL: u64 = 2;
const E_FOLLOWER_UNDERFLOW: u64 = 3;

/// Channel owned by creator, holds treasury and pricing
public struct Channel has key, store {
    id: UID,
    owner: address,
    name: String,
    avatar_url: String,
    bio: String,
    suins: String,
    monthly_price: u64,
    yearly_price: u64,
    treasury: balance::Balance<SUI>,
    follower_count: u64,
}

/// Capability for privileged operations
public struct ChannelCap has key, store {
    id: UID,
    channel_id: ID,
}

/// Registry enforcing one channel per owner
public struct ChannelRegistry has key, store {
    id: UID,
    owners: table::Table<address, ID>,
}

/// Follow ticket (owned by follower)
public struct FollowTicket has key, store {
    id: UID,
    channel_id: ID,
    follower: address,
}

/// Create and share a registry (one shared object for everyone)
public entry fun create_registry(ctx: &mut TxContext): ID {
    let registry = ChannelRegistry { id: object::new(ctx), owners: table::new(ctx) };
    let id = registry.id.to_inner();
    transfer::share_object(registry);
    id
}

public fun create(
    registry: &mut ChannelRegistry,
    name: String,
    avatar_url: String,
    bio: String,
    suins: String,
    monthly_price: u64,
    yearly_price: u64,
    ctx: &mut TxContext,
): ChannelCap {
    let owner = tx_context::sender(ctx);
    if (table::contains(&registry.owners, owner)) {
        abort E_ALREADY_HAS_CHANNEL
    };
    let channel = Channel {
        id: object::new(ctx),
        owner,
        name,
        avatar_url,
        bio,
        suins,
        monthly_price,
        yearly_price,
        treasury: balance::zero<SUI>(),
        follower_count: 0,
    };

    let channel_id = channel.id.to_inner();
    transfer::share_object(channel);
    let cap = ChannelCap { id: object::new(ctx), channel_id };
    table::add(&mut registry.owners, owner, channel_id);
    events::emit_channel_created(channel_id, owner, name);
    events::emit_channel_pricing(channel_id, monthly_price, yearly_price);
    cap
}

/// Update metadata (owner only)
public fun update_metadata(
    cap: &ChannelCap,
    channel: &mut Channel,
    name: String,
    avatar_url: String,
    bio: String,
    suins: String,
    _ctx: &TxContext,
) {
    assert!(cap.channel_id == channel.id.to_inner(), E_NOT_OWNER);
    // duplicate strings via bytes so we can both store and emit
    let name_bytes = string::into_bytes(name);
    let avatar_bytes = string::into_bytes(avatar_url);
    let bio_bytes = string::into_bytes(bio);
    let suins_bytes = string::into_bytes(suins);

    let name_store = string::utf8(clone_bytes(&name_bytes));
    let avatar_store = string::utf8(clone_bytes(&avatar_bytes));
    let bio_store = string::utf8(clone_bytes(&bio_bytes));
    let suins_store = string::utf8(clone_bytes(&suins_bytes));

    let name_event = string::utf8(name_bytes);
    let avatar_event = string::utf8(avatar_bytes);
    let bio_event = string::utf8(bio_bytes);
    let suins_event = string::utf8(suins_bytes);

    channel.name = name_store;
    channel.avatar_url = avatar_store;
    channel.bio = bio_store;
    channel.suins = suins_store;
    events::emit_channel_metadata(channel.id.to_inner(), name_event, avatar_event, bio_event, suins_event);
}

/// Update pricing (owner only)
public fun set_prices(
    cap: &ChannelCap,
    channel: &mut Channel,
    monthly_price: u64,
    yearly_price: u64,
) {
    assert!(cap.channel_id == channel.id.to_inner(), E_NOT_OWNER);
    channel.monthly_price = monthly_price;
    channel.yearly_price = yearly_price;
    events::emit_channel_pricing(channel.id.to_inner(), monthly_price, yearly_price);
}

/// Treasury deposit helper (package-only)
public(package) fun deposit(channel: &mut Channel, payment: Coin<SUI>) {
    let bal = coin::into_balance(payment);
    balance::join(&mut channel.treasury, bal);
}

/// Withdraw specific amount (owner only)
public fun withdraw(
    cap: &ChannelCap,
    channel: &mut Channel,
    amount: u64,
    ctx: &mut TxContext,
): Coin<SUI> {
    assert!(cap.channel_id == channel.id.to_inner(), E_NOT_OWNER);
    let bal = balance::split(&mut channel.treasury, amount);
    coin::from_balance(bal, ctx)
}

public fun get_pricing(channel: &Channel): (u64, u64) {
    (channel.monthly_price, channel.yearly_price)
}

public fun get_owner(channel: &Channel): address { channel.owner }

public fun get_id(channel: &Channel): ID { channel.id.to_inner() }

public fun get_cap_channel_id(cap: &ChannelCap): ID { cap.channel_id }

/// Validate payment equals price; returns payment for caller to forward to treasury
public fun validate_payment(payment: &Coin<SUI>, expected: u64) {
    assert!(coin::value(payment) == expected, E_PAYMENT_MISMATCH);
}

/// Follow a channel (mint ticket)
public entry fun follow(channel: &mut Channel, ctx: &mut TxContext) {
    channel.follower_count = channel.follower_count + 1;
    let follower = tx_context::sender(ctx);
    events::emit_follow(channel.id.to_inner(), follower);
    let ticket = FollowTicket {
        id: object::new(ctx),
        channel_id: channel.id.to_inner(),
        follower,
    };
    transfer::transfer(ticket, follower);
}

/// Unfollow by consuming ticket
public entry fun unfollow(channel: &mut Channel, ticket: FollowTicket, _ctx: &mut TxContext) {
    assert!(ticket.channel_id == channel.id.to_inner(), E_NOT_OWNER);
    if (channel.follower_count == 0) { abort E_FOLLOWER_UNDERFLOW };
    channel.follower_count = channel.follower_count - 1;
    events::emit_unfollow(channel.id.to_inner(), ticket.follower);
    let FollowTicket { id, channel_id: _, follower: _ } = ticket;
    object::delete(id);
}

public fun get_followers(channel: &Channel): u64 { channel.follower_count }

fun clone_bytes(src: &vector<u8>): vector<u8> {
    let mut out = vector::empty<u8>();
    let len = vector::length(src);
    let mut i = 0;
    while (i < len) {
        vector::push_back(&mut out, *vector::borrow(src, i));
        i = i + 1;
    };
    out
}
