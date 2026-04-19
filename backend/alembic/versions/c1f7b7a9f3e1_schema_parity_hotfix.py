"""schema parity hotfix

Revision ID: c1f7b7a9f3e1
Revises: 862a475c39d0
Create Date: 2026-04-19
"""

from alembic import op


revision = "c1f7b7a9f3e1"
down_revision = "862a475c39d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Align runtime DB with current ORM models using idempotent DDL.
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS referrer_id BIGINT")
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_reward_status VARCHAR(32) DEFAULT 'pending'"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_orders_referrer_id ON orders (referrer_id)")

    op.execute("ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pts_balance INTEGER DEFAULT 0")
    op.execute("ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pts_total_earned INTEGER DEFAULT 0")
    op.execute(
        "ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pts_last_updated TIMESTAMP DEFAULT NOW()"
    )

    op.execute(
        "ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS reference_id VARCHAR(100)"
    )
    op.execute("ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS metadata_json JSONB")


def downgrade() -> None:
    # Keep downgrade safe and idempotent for shared/dev environments.
    op.execute("ALTER TABLE wallet_transactions DROP COLUMN IF EXISTS metadata_json")
    op.execute("ALTER TABLE wallet_transactions DROP COLUMN IF EXISTS reference_id")

    op.execute("ALTER TABLE wallets DROP COLUMN IF EXISTS pts_last_updated")
    op.execute("ALTER TABLE wallets DROP COLUMN IF EXISTS pts_total_earned")
    op.execute("ALTER TABLE wallets DROP COLUMN IF EXISTS pts_balance")

    op.execute("DROP INDEX IF EXISTS ix_orders_referrer_id")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS referral_reward_status")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS referrer_id")
