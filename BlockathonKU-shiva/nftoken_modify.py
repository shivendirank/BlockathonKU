"""
NFTokenModify — Typed xrpl-py model for XLS-46d Dynamic NFT amendment.
TransactionType.NFTOKEN_MODIFY is already in the xrpl-py enum but the
Transaction subclass was never shipped. This module provides it.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Dict

from xrpl.models.transactions.transaction import Transaction, TransactionType
from xrpl.models.utils import require_kwargs_on_init, KW_ONLY_DATACLASS

_MAX_URI_LENGTH = 512  # same limit as NFTokenMint


@require_kwargs_on_init
@dataclass(frozen=True, **KW_ONLY_DATACLASS)
class NFTokenModify(Transaction):
    """
    NFTokenModify (XLS-46d) — updates the URI field of an existing NFToken.

    This is the transaction that powers AeroGuard's living Digital Twin:
    when the Arduino detects a crash, we call NFTokenModify to swap the
    NFT URI from the nominal Pinata CID to the crash evidence CID.

    Spec: https://github.com/XRPLF/XRPL-Standards/discussions/46
    """

    nftoken_id: str = field(default=None)
    """
    The NFTokenID of the NFToken to be modified.
    This is the 64-character hex identifier returned when the NFT was minted.

    :meta hide-value:
    """

    uri: Optional[str] = None
    """
    New URI that points to the updated data/metadata for the NFT.
    Must be hex-encoded. Use xrpl.utils.str_to_hex to convert a plain string.
    For AeroGuard: "ipfs://<crash_cid>" hex-encoded.

    Maximum length: 512 characters (hex form, so 256 bytes of actual data).
    """

    transaction_type: TransactionType = field(
        default=TransactionType.NFTOKEN_MODIFY,
        init=False,
    )

    def _get_errors(self) -> Dict[str, str]:
        return {
            key: value
            for key, value in {
                **super()._get_errors(),
                "nftoken_id": self._get_nftoken_id_error(),
                "uri":        self._get_uri_error(),
            }.items()
            if value is not None
        }

    def _get_nftoken_id_error(self) -> Optional[str]:
        if not self.nftoken_id:
            return "nftoken_id is required for NFTokenModify"
        if len(self.nftoken_id) != 64:
            return f"nftoken_id must be 64 hex characters, got {len(self.nftoken_id)}"
        return None

    def _get_uri_error(self) -> Optional[str]:
        if self.uri is not None and len(self.uri) > _MAX_URI_LENGTH:
            return f"URI must not exceed {_MAX_URI_LENGTH} hex characters"
        return None
