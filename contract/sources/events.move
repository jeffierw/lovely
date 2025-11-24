module funs::events;

use std::string::String;

/// Emitted when a channel is created
public struct ChannelCreated has copy, drop {
    channel_id: ID,
    owner: address,
    name: String,
}

/// Emitted when channel pricing is updated
public struct ChannelPricingUpdated has copy, drop {
    channel_id: ID,
    monthly_price: u64,
    yearly_price: u64,
}

/// Emitted when metadata changes
public struct ChannelMetadataUpdated has copy, drop {
    channel_id: ID,
    name: String,
    avatar_url: String,
    bio: String,
    suins: String,
}

/// Emitted when a work is published
public struct WorkPublished has copy, drop {
    work_id: ID,
    channel_id: ID,
    author: address,
    gating: u8, // 0 free, 1 one-time, 2 subscription
    price: u64,
}

/// Emitted when a work is updated
public struct WorkUpdated has copy, drop {
    work_id: ID,
    channel_id: ID,
    gating: u8,
    price: u64,
}

/// Emitted when a subscription is purchased or extended
public struct SubscriptionUpdated has copy, drop {
    subscription_id: ID,
    channel_id: ID,
    subscriber: address,
    expires_at_ms: u64,
    plan: u8, // 1 = month, 2 = year
}

/// Emitted when a one-time unlock NFT is minted
public struct WorkUnlocked has copy, drop {
    work_id: ID,
    channel_id: ID,
    to: address,
    price: u64,
}

/// Emitted when user signs terms
public struct TermsSigned has copy, drop {
    user: address,
    terms_hash: vector<u8>,
}

/// Emitted when follow/unfollow occurs
public struct Followed has copy, drop {
    channel_id: ID,
    follower: address,
}

public struct Unfollowed has copy, drop {
    channel_id: ID,
    follower: address,
}

public fun emit_channel_created(channel_id: ID, owner: address, name: String) {
    sui::event::emit(ChannelCreated { channel_id, owner, name });
}

public fun emit_channel_pricing(channel_id: ID, monthly_price: u64, yearly_price: u64) {
    sui::event::emit(ChannelPricingUpdated { channel_id, monthly_price, yearly_price });
}

public fun emit_channel_metadata(
    channel_id: ID,
    name: String,
    avatar_url: String,
    bio: String,
    suins: String,
) {
    sui::event::emit(ChannelMetadataUpdated { channel_id, name, avatar_url, bio, suins });
}

public fun emit_work_published(
    work_id: ID,
    channel_id: ID,
    author: address,
    gating: u8,
    price: u64,
) {
    sui::event::emit(WorkPublished { work_id, channel_id, author, gating, price });
}

public fun emit_work_updated(work_id: ID, channel_id: ID, gating: u8, price: u64) {
    sui::event::emit(WorkUpdated { work_id, channel_id, gating, price });
}

public fun emit_subscription(
    subscription_id: ID,
    channel_id: ID,
    subscriber: address,
    expires_at_ms: u64,
    plan: u8,
) {
    sui::event::emit(SubscriptionUpdated {
        subscription_id,
        channel_id,
        subscriber,
        expires_at_ms,
        plan,
    });
}

public fun emit_work_unlocked(work_id: ID, channel_id: ID, to: address, price: u64) {
    sui::event::emit(WorkUnlocked { work_id, channel_id, to, price });
}

public fun emit_terms_signed(user: address, terms_hash: vector<u8>) {
    sui::event::emit(TermsSigned { user, terms_hash });
}

public fun emit_follow(channel_id: ID, follower: address) {
    sui::event::emit(Followed { channel_id, follower });
}

public fun emit_unfollow(channel_id: ID, follower: address) {
    sui::event::emit(Unfollowed { channel_id, follower });
}
