"""change_role_to_native_pg_enum

Revision ID: db5f18369348
Revises: 5d34925c67e8
Create Date: 2026-08-15 11:11:01.327890

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'db5f18369348'
down_revision: Union[str, Sequence[str], None] = '5d34925c67e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_role_enum = postgresql.ENUM(
    'Athlete',
    'Coach',
    'Physiotherapist',
    'Sports Scientist',
    'Administrator',
    name='user_role_enum',
    create_type=False,
)


def upgrade() -> None:
    # 1. Create native PostgreSQL ENUM type
    user_role_enum.create(op.get_bind(), checkfirst=True)

    # 2. Alter column type using explicit cast
    op.alter_column(
        'users',
        'role',
        existing_type=sa.VARCHAR(length=16),
        type_=user_role_enum,
        existing_nullable=False,
        postgresql_using='role::user_role_enum',
    )


def downgrade() -> None:
    # 1. Convert back to VARCHAR
    op.alter_column(
        'users',
        'role',
        existing_type=user_role_enum,
        type_=sa.VARCHAR(length=16),
        existing_nullable=False,
        postgresql_using='role::text',
    )

    # 2. Drop the enum type
    user_role_enum.drop(op.get_bind(), checkfirst=True)
