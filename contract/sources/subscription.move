module funs::subscription;

use funs::channel;
use funs::events;
use sui::clock::{Self, Clock};
use sui::coin::Coin;
use sui::sui::SUI;

const PLAN_MONTH: u8 = 1;
const PLAN_YEAR: u8 = 2;
const E_WRONG_PLAN: u64 = 0;

/// Channel subscription object owned by subscriber
public struct ChannelSubscription has key, store {
    id: UID,
    channel_id: ID,
    subscriber: address,
    expires_at_ms: u64,
    plan: u8,
}

public fun subscribe(
    channel_obj: &mut channel::Channel,
    payment: Coin<SUI>,
    plan: u8,
    clock: &Clock,
    ctx: &mut TxContext,
): ChannelSubscription {
    let (monthly, yearly) = channel::get_pricing(channel_obj);
    let price = if (plan == PLAN_MONTH) { monthly } else if (plan == PLAN_YEAR) { yearly } else {
        0
    };
    assert!(price > 0, E_WRONG_PLAN);
    channel::validate_payment(&payment, price);

    // Move funds to treasury
    channel::deposit(channel_obj, payment);

    let now = clock::timestamp_ms(clock);
    let duration = if (plan == PLAN_MONTH) { 30 * 24 * 60 * 60 * 1000 } else {
        365 * 24 * 60 * 60 * 1000
    };
    let expires = now + duration;

    let sub = ChannelSubscription {
        id: object::new(ctx),
        channel_id: channel::get_id(channel_obj),
        subscriber: tx_context::sender(ctx),
        expires_at_ms: expires,
        plan,
    };
    events::emit_subscription(
        sub.id.to_inner(),
        sub.channel_id,
        sub.subscriber,
        sub.expires_at_ms,
        plan,
    );
    sub
}

public fun extend(
    subscription: &mut ChannelSubscription,
    channel_obj: &mut channel::Channel,
    payment: Coin<SUI>,
    plan: u8,
    _clock: &Clock,
) {
    let (monthly, yearly) = channel::get_pricing(channel_obj);
    let price = if (plan == PLAN_MONTH) { monthly } else if (plan == PLAN_YEAR) { yearly } else {
        0
    };
    assert!(price > 0, E_WRONG_PLAN);
    channel::validate_payment(&payment, price);
    channel::deposit(channel_obj, payment);

    let duration = if (plan == PLAN_MONTH) { 30 * 24 * 60 * 60 * 1000 } else {
        365 * 24 * 60 * 60 * 1000
    };
    subscription.expires_at_ms = subscription.expires_at_ms + duration;
    events::emit_subscription(
        subscription.id.to_inner(),
        subscription.channel_id,
        subscription.subscriber,
        subscription.expires_at_ms,
        plan,
    );
}

public fun is_active(sub: &ChannelSubscription, clock: &Clock): bool {
    clock::timestamp_ms(clock) < sub.expires_at_ms
}

public fun get_channel_id(sub: &ChannelSubscription): ID { sub.channel_id }
