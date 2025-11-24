module funs::terms;

use funs::events;

/// Sign site terms; records event with hash of current version
public fun sign(terms_hash: vector<u8>, _ctx: &TxContext) {
    events::emit_terms_signed(tx_context::sender(_ctx), terms_hash);
}
