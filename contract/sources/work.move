module funs::work;

use funs::access_nft;
use funs::channel;
use funs::events;
use funs::subscription;
use std::string::String;
use std::string;
use sui::clock::Clock;
use sui::coin::Coin;
use sui::object::{Self as object, ID, UID};
use sui::sui::SUI;

const E_NOT_OWNER: u64 = 0;
const E_GATING: u64 = 1;

/// Gating modes
public enum Gating has copy, drop, store {
    Free,
    OneTime,
    Subscription,
}

/// Work object (shared)
public struct Work has key, store {
    id: UID,
    channel_id: ID,
    author: address,
    gating: Gating,
    price: u64,
    manifest: String, // Walrus/Seal manifest or summary
    cover_url: String,
    media_ids: vector<ID>,
}

/// Publish work using channel capability
public fun publish(
    cap: &channel::ChannelCap,
    channel_obj: &mut channel::Channel,
    gating: Gating,
    price: u64,
    manifest: String,
    cover_url: String,
    media_ids: vector<ID>,
    ctx: &mut TxContext,
): ID {
    assert!(channel::get_cap_channel_id(cap) == channel::get_id(channel_obj), E_NOT_OWNER);
    let work = Work {
        id: object::new(ctx),
        channel_id: channel::get_id(channel_obj),
        author: tx_context::sender(ctx),
        gating,
        price,
        manifest: manifest,
        cover_url,
        media_ids,
    };
    let work_id = work.id.to_inner();
    events::emit_work_published(
        work_id,
        work.channel_id,
        work.author,
        gating_to_u8(&work.gating),
        price,
    );
    transfer::share_object(work);
    work_id
}

/// Update gating/price/manifest/cover (owner via channel cap)
public entry fun update(
    cap: &channel::ChannelCap,
    channel_obj: &mut channel::Channel,
    work: &mut Work,
    gating: u8,
    price: u64,
    manifest: String,
    cover_url: String,
) {
    assert!(channel::get_cap_channel_id(cap) == channel::get_id(channel_obj), E_NOT_OWNER);
    assert!(channel::get_id(channel_obj) == work.channel_id, E_NOT_OWNER);
    work.gating = gating_from_u8(gating);
    work.price = price;
    work.manifest = manifest;
    work.cover_url = cover_url;
    events::emit_work_updated(work.id.to_inner(), work.channel_id, gating, price);
}

/// Soft-delete a work (marks as free & clears content)
public entry fun disable(
    cap: &channel::ChannelCap,
    channel_obj: &mut channel::Channel,
    work: &mut Work,
) {
    assert!(channel::get_cap_channel_id(cap) == channel::get_id(channel_obj), E_NOT_OWNER);
    assert!(channel::get_id(channel_obj) == work.channel_id, E_NOT_OWNER);
    work.gating = Gating::Free;
    work.price = 0;
    work.manifest = string::utf8(b"");
    work.cover_url = string::utf8(b"");
    events::emit_work_updated(work.id.to_inner(), work.channel_id, gating_to_u8(&work.gating), 0);
}

/// Purchase one-time access, returns NFT
public fun unlock_once(
    work: &Work,
    channel_obj: &mut channel::Channel,
    payment: Coin<SUI>,
    ctx: &mut TxContext,
): access_nft::AccessNft {
    match (&work.gating) {
        Gating::OneTime => (),
        _ => { abort E_GATING },
    };
    let expected = work.price;
    channel::validate_payment(&payment, expected);
    channel::deposit(channel_obj, payment);
    events::emit_work_unlocked(
        work.id.to_inner(),
        work.channel_id,
        tx_context::sender(ctx),
        expected,
    );
    access_nft::mint(work.id.to_inner(), work.channel_id, ctx)
}

/// Check if user can view a work given gating and proofs
public fun can_view(
    work: &Work,
    maybe_subscription: &subscription::ChannelSubscription,
    clock: &Clock,
): bool {
    match (&work.gating) {
        Gating::Free => true,
        Gating::OneTime => false, // caller should pass NFT check off-chain
        Gating::Subscription => subscription::is_active(maybe_subscription, clock) && subscription::get_channel_id(maybe_subscription) == work.channel_id,
    }
}

/// Helpers to construct gating variants from transaction blocks
public fun gating_free(): Gating { Gating::Free }
public fun gating_one_time(): Gating { Gating::OneTime }
public fun gating_subscription(): Gating { Gating::Subscription }

fun gating_to_u8(g: &Gating): u8 {
    match (g) {
        Gating::Free => 0,
        Gating::OneTime => 1,
        Gating::Subscription => 2,
    }
}

fun gating_from_u8(v: u8): Gating {
    if (v == 1) {
        Gating::OneTime
    } else if (v == 2) {
        Gating::Subscription
    } else {
        Gating::Free
    }
}
