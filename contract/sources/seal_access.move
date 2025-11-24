/// Seal access control module for subscription-based content
/// Implements the Seal pattern for verifying on-chain access rights
/// Reference: https://github.com/MystenLabs/seal/blob/main/move/patterns/sources/subscription.move

module funs::seal_access;

use funs::subscription::{Self, ChannelSubscription};
use sui::clock::Clock;

const ENoAccess: u64 = 77;
const EWrongVersion: u64 = 5;

const VERSION: u64 = 1;

/// Manage the version of the package for which seal_approve functions should be evaluated with
public struct PackageVersion has key {
    id: UID,
    version: u64,
}

/// Capability for managing PackageVersion
public struct PackageVersionCap has key {
    id: UID,
}

fun init(ctx: &mut TxContext) {
    transfer::share_object(PackageVersion {
        id: object::new(ctx),
        version: VERSION,
    });
    transfer::transfer(
        PackageVersionCap { id: object::new(ctx) },
        ctx.sender(),
    );
}

/// Check if a user with a subscription can access a specific content
/// Key ID format: [package_id][channel_id][work_id]
fun check_policy(
    key_id: vector<u8>,
    pkg_version: &PackageVersion,
    sub: &ChannelSubscription,
    channel_id: ID,
    clock: &Clock,
): bool {
    // Check we are using the right version of the package
    assert!(pkg_version.version == VERSION, EWrongVersion);

    // Check if subscription is active
    if (!subscription::is_active(sub, clock)) {
        return false
    };

    // Check if subscription matches the channel
    if (subscription::get_channel_id(sub) != channel_id) {
        return false
    };

    // Check if the key_id has the right prefix (channel_id)
    let channel_namespace = channel_id.to_bytes();
    let mut i = 0;

    // Key ID should contain at least the channel ID
    if (channel_namespace.length() > key_id.length()) {
        return false
    };

    // Verify channel_id prefix in key_id
    while (i < channel_namespace.length()) {
        if (channel_namespace[i] != key_id[i]) {
            return false
        };
        i = i + 1;
    };

    true
}

/// Entry function called by Seal Key Server to verify access
/// This is invoked as part of the decryption flow
entry fun seal_approve(
    key_id: vector<u8>,
    pkg_version: &PackageVersion,
    sub: &ChannelSubscription,
    channel_id: ID,
    clock: &Clock,
) {
    assert!(check_policy(key_id, pkg_version, sub, channel_id, clock), ENoAccess);
}

#[test_only]
public fun create_for_testing(ctx: &mut TxContext): (PackageVersion, PackageVersionCap) {
    let pkg_version = PackageVersion {
        id: object::new(ctx),
        version: VERSION,
    };
    (pkg_version, PackageVersionCap { id: object::new(ctx) })
}

#[test_only]
public fun destroy_versions_for_testing(
    pkg_version: PackageVersion,
    pkg_version_cap: PackageVersionCap,
) {
    let PackageVersion { id, .. } = pkg_version;
    object::delete(id);
    let PackageVersionCap { id, .. } = pkg_version_cap;
    object::delete(id);
}
