"""add_pose_landmarks_and_analysis_status

Revision ID: a1b2c3d4e5f6
Revises: 507b90721148
Create Date: 2026-08-27 14:19:00.000000

Changes:
  1. analysis_results — add columns:
       status, error_message, fps, frame_count, duration_seconds,
       width, height, frames_processed, completed_at
  2. pose_landmarks — new table with composite index
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '507b90721148'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add analysis status/metadata columns and create pose_landmarks table."""

    # ── 1. Extend analysis_results ────────────────────────────────────────────
    op.add_column(
        'analysis_results',
        sa.Column(
            'status',
            sa.String(length=20),
            nullable=False,
            server_default='PENDING',
        ),
    )
    op.add_column(
        'analysis_results',
        sa.Column('error_message', sa.Text(), nullable=True),
    )
    op.add_column(
        'analysis_results',
        sa.Column('fps', sa.Float(), nullable=True),
    )
    op.add_column(
        'analysis_results',
        sa.Column('frame_count', sa.Integer(), nullable=True),
    )
    op.add_column(
        'analysis_results',
        sa.Column('duration_seconds', sa.Float(), nullable=True),
    )
    op.add_column(
        'analysis_results',
        sa.Column('width', sa.Integer(), nullable=True),
    )
    op.add_column(
        'analysis_results',
        sa.Column('height', sa.Integer(), nullable=True),
    )
    op.add_column(
        'analysis_results',
        sa.Column('frames_processed', sa.Integer(), nullable=True),
    )
    op.add_column(
        'analysis_results',
        sa.Column('completed_at', sa.DateTime(), nullable=True),
    )

    # Index on status for polling queries
    op.create_index(
        'ix_analysis_results_status',
        'analysis_results',
        ['status'],
    )

    # ── 2. Create pose_landmarks ──────────────────────────────────────────────
    op.create_table(
        'pose_landmarks',
        sa.Column(
            'landmark_id',
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            'analysis_id',
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                'analysis_results.analysis_id',
                ondelete='CASCADE',
            ),
            nullable=False,
        ),
        sa.Column('frame_number',   sa.Integer(), nullable=False),
        sa.Column('timestamp_ms',   sa.Float(),   nullable=False),
        sa.Column('landmark_index', sa.Integer(), nullable=False),
        sa.Column('landmark_name',  sa.String(length=40), nullable=False),
        sa.Column('x',          sa.Float(), nullable=False),
        sa.Column('y',          sa.Float(), nullable=False),
        sa.Column('z',          sa.Float(), nullable=False),
        sa.Column('visibility', sa.Float(), nullable=False),
    )

    # Composite index for per-frame queries
    op.create_index(
        'ix_pose_landmarks_analysis_frame',
        'pose_landmarks',
        ['analysis_id', 'frame_number'],
    )

    # Simple index on analysis_id alone
    op.create_index(
        'ix_pose_landmarks_analysis_id',
        'pose_landmarks',
        ['analysis_id'],
    )


def downgrade() -> None:
    """Reverse all changes from upgrade()."""
    op.drop_index('ix_pose_landmarks_analysis_id',    table_name='pose_landmarks')
    op.drop_index('ix_pose_landmarks_analysis_frame', table_name='pose_landmarks')
    op.drop_table('pose_landmarks')

    op.drop_index('ix_analysis_results_status', table_name='analysis_results')
    op.drop_column('analysis_results', 'completed_at')
    op.drop_column('analysis_results', 'frames_processed')
    op.drop_column('analysis_results', 'height')
    op.drop_column('analysis_results', 'width')
    op.drop_column('analysis_results', 'duration_seconds')
    op.drop_column('analysis_results', 'frame_count')
    op.drop_column('analysis_results', 'fps')
    op.drop_column('analysis_results', 'error_message')
    op.drop_column('analysis_results', 'status')
