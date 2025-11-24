module funs::access_nft;

use std::string;
use sui::display;
use sui::package;

/// One-time unlock NFT
public struct AccessNft has key, store {
    id: UID,
    work_id: ID,
    channel_id: ID,
    issued_at_ms: u64,
}

/// One-time witness must be all-caps module name
public struct ACCESS_NFT has drop {}

fun init(otw: ACCESS_NFT, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);
    let keys = vector[string::utf8(b"name"), string::utf8(b"description")];
    let values = vector[
        string::utf8(b"lovely unlock"),
        string::utf8(b"Access pass for gated content"),
    ];
    let mut display_obj = display::new_with_fields<AccessNft>(&publisher, keys, values, ctx);
    display::update_version(&mut display_obj);
    transfer::public_transfer(publisher, tx_context::sender(ctx));
    transfer::public_transfer(display_obj, tx_context::sender(ctx));
}

public fun mint(work_id: ID, channel_id: ID, ctx: &mut TxContext): AccessNft {
    AccessNft {
        id: object::new(ctx),
        work_id,
        channel_id,
        issued_at_ms: tx_context::epoch_timestamp_ms(ctx),
    }
}

public fun matches(nft: &AccessNft, work_id: ID): bool { nft.work_id == work_id }

public fun get_work_id(nft: &AccessNft): ID { nft.work_id }
