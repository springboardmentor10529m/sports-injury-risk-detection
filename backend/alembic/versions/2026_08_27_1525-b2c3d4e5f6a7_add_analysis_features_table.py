"""add_analysis_features_table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-27 15:25:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'analysis_features',
        sa.Column(
            'feature_id',
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            'analysis_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                'analysis_results.analysis_id',
                ondelete='CASCADE',
            ),
            nullable=False,
            unique=True,
        ),
        sa.Column('feature_version', sa.String(length=20), nullable=False, server_default='v1'),
        sa.Column('features', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index(
        'ix_analysis_features_analysis_id',
        'analysis_features',
        ['analysis_id'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index('ix_analysis_features_analysis_id', table_name='analysis_features')
    op.drop_table('analysis_features')
