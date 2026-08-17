"""align database with injury detection schema

Revision ID: 20ddf52c0e83
Revises: db5f18369348
Create Date: 2026-08-18 00:22:59.427728

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20ddf52c0e83'
down_revision: Union[str, Sequence[str], None] = 'db5f18369348'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # 1. Create the new injury-detection schema
    op.create_table(
        'athletes',
        sa.Column('athlete_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('sport', sa.String(), nullable=True),
        sa.Column('position', sa.String(), nullable=True),
        sa.Column('age', sa.Integer(), nullable=True),
        sa.Column('height', sa.Float(), nullable=True),
        sa.Column('weight', sa.Float(), nullable=True),
        sa.Column('training_load', sa.Float(), nullable=True),
        sa.Column('flexibility', sa.Float(), nullable=True),
        sa.Column('strength', sa.Float(), nullable=True),
        sa.Column('balance', sa.Float(), nullable=True),
        sa.Column('endurance', sa.Float(), nullable=True),
        sa.Column('coach_notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id']),
        sa.PrimaryKeyConstraint('athlete_id')
    )

    op.create_table(
        'notifications',
        sa.Column('notification_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('notification_type', sa.String(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id']),
        sa.PrimaryKeyConstraint('notification_id')
    )

    op.create_table(
        'injury_history',
        sa.Column('injury_id', sa.UUID(), nullable=False),
        sa.Column('athlete_id', sa.UUID(), nullable=False),
        sa.Column('injury_type', sa.String(), nullable=True),
        sa.Column('body_part', sa.String(), nullable=True),
        sa.Column('severity', sa.String(), nullable=True),
        sa.Column('injury_date', sa.Date(), nullable=True),
        sa.Column('recovery_date', sa.Date(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['athlete_id'], ['athletes.athlete_id']),
        sa.PrimaryKeyConstraint('injury_id')
    )

    op.create_table(
        'performance_records',
        sa.Column('record_id', sa.UUID(), nullable=False),
        sa.Column('athlete_id', sa.UUID(), nullable=False),
        sa.Column('activity', sa.String(), nullable=True),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['athlete_id'], ['athletes.athlete_id']),
        sa.PrimaryKeyConstraint('record_id')
    )

    op.create_table(
        'reports',
        sa.Column('report_id', sa.UUID(), nullable=False),
        sa.Column('athlete_id', sa.UUID(), nullable=False),
        sa.Column('report_type', sa.String(), nullable=True),
        sa.Column('generated_by', sa.UUID(), nullable=False),
        sa.Column('file_path', sa.Text(), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['athlete_id'], ['athletes.athlete_id']),
        sa.ForeignKeyConstraint(['generated_by'], ['users.user_id']),
        sa.PrimaryKeyConstraint('report_id')
    )

    op.create_table(
        'videos',
        sa.Column('video_id', sa.UUID(), nullable=False),
        sa.Column('athlete_id', sa.UUID(), nullable=False),
        sa.Column('activity', sa.String(), nullable=True),
        sa.Column('video_url', sa.Text(), nullable=True),
        sa.Column('duration', sa.Float(), nullable=True),
        sa.Column('fps', sa.Integer(), nullable=True),
        sa.Column('resolution', sa.String(), nullable=True),
        sa.Column('quality_score', sa.Float(), nullable=True),
        sa.Column('processing_status', sa.String(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['athlete_id'], ['athletes.athlete_id']),
        sa.PrimaryKeyConstraint('video_id')
    )

    op.create_table(
        'analysis_results',
        sa.Column('analysis_id', sa.UUID(), nullable=False),
        sa.Column('video_id', sa.UUID(), nullable=False),
        sa.Column('athlete_id', sa.UUID(), nullable=False),
        sa.Column('knee_valgus', sa.Float(), nullable=True),
        sa.Column('hip_stability', sa.Float(), nullable=True),
        sa.Column('trunk_lean', sa.Float(), nullable=True),
        sa.Column('stride_length', sa.Float(), nullable=True),
        sa.Column('joint_alignment', sa.Float(), nullable=True),
        sa.Column('symmetry_score', sa.Float(), nullable=True),
        sa.Column('fatigue_score', sa.Float(), nullable=True),
        sa.Column('movement_quality', sa.Float(), nullable=True),
        sa.Column('overall_risk_score', sa.Float(), nullable=True),
        sa.Column('risk_level', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['athlete_id'], ['athletes.athlete_id']),
        sa.ForeignKeyConstraint(['video_id'], ['videos.video_id']),
        sa.PrimaryKeyConstraint('analysis_id')
    )

    op.create_table(
        'injury_predictions',
        sa.Column('prediction_id', sa.UUID(), nullable=False),
        sa.Column('analysis_id', sa.UUID(), nullable=False),
        sa.Column('acl_risk', sa.Float(), nullable=True),
        sa.Column('hamstring_risk', sa.Float(), nullable=True),
        sa.Column('ankle_risk', sa.Float(), nullable=True),
        sa.Column('shoulder_risk', sa.Float(), nullable=True),
        sa.Column('lower_back_risk', sa.Float(), nullable=True),
        sa.Column('overuse_risk', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['analysis_id'], ['analysis_results.analysis_id']),
        sa.PrimaryKeyConstraint('prediction_id')
    )

    op.create_table(
        'recommendations',
        sa.Column('recommendation_id', sa.UUID(), nullable=False),
        sa.Column('prediction_id', sa.UUID(), nullable=False),
        sa.Column('exercise', sa.Text(), nullable=True),
        sa.Column('mobility', sa.Text(), nullable=True),
        sa.Column('strengthening', sa.Text(), nullable=True),
        sa.Column('recovery', sa.Text(), nullable=True),
        sa.Column('training_modification', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['prediction_id'], ['injury_predictions.prediction_id']),
        sa.PrimaryKeyConstraint('recommendation_id')
    )

    # 2. Remove the old schema.
    # CASCADE handles the foreign-key dependencies.
    op.execute("DROP TABLE IF EXISTS injury_records CASCADE")
    op.execute("DROP TABLE IF EXISTS training_loads CASCADE")
    op.execute("DROP TABLE IF EXISTS physical_assessments CASCADE")
    op.execute("DROP TABLE IF EXISTS athlete_profiles CASCADE")

    # 3. Update users table
    op.alter_column(
        'users',
        'password',
        existing_type=sa.TEXT(),
        nullable=False
    )

    op.execute("DROP INDEX IF EXISTS ix_users_oauth_id")
    op.execute("DROP INDEX IF EXISTS ix_users_user_id")

    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS oauth_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS updated_at")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS oauth_provider")