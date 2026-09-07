"""add_analysis_less_results_table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-02 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'analysis_less_results',
        sa.Column(
            'less_id',
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
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('max_computable_score', sa.Integer(), nullable=False),
        sa.Column('computable_items', sa.Integer(), nullable=False),
        sa.Column('error_items', sa.Integer(), nullable=False),
        sa.Column('not_computable_items', sa.Integer(), nullable=False),
        sa.Column('classification', sa.String(length=100), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('validation_source', sa.String(length=100), nullable=False),
        sa.Column('source_version', sa.String(length=20), nullable=False, server_default='v1'),
        sa.Column('disclaimer', sa.Text(), nullable=False),
        sa.Column('items', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
    )
    op.create_index(
        'ix_analysis_less_results_analysis_id',
        'analysis_less_results',
        ['analysis_id'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index('ix_analysis_less_results_analysis_id', table_name='analysis_less_results')
    op.drop_table('analysis_less_results')
