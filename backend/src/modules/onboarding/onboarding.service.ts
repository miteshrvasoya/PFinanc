import { QueryHelper } from '../../database/queryHelper.js';

export interface OnboardingState {
  id: string;
  household_id: string;
  user_id: string;
  current_step: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  completed_sections: string[];
  metadata: Record<string, any>;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
}

export class OnboardingService {
  /**
   * Get or initialize onboarding state for the active user within the household
   */
  static async getStatus(userId: string, householdId: string): Promise<OnboardingState> {
    let state = await QueryHelper.queryOne<OnboardingState>(
      `SELECT * FROM onboarding_progress WHERE user_id = $1 AND household_id = $2`,
      [userId, householdId]
    );

    if (!state) {
      state = await QueryHelper.insert<OnboardingState>('onboarding_progress', {
        household_id: householdId,
        user_id: userId,
        current_step: 'bank_accounts',
        status: 'IN_PROGRESS',
        completed_sections: JSON.stringify([]),
        metadata: JSON.stringify({}),
      });
    }

    const currentSections = state.completed_sections;
    if (typeof currentSections === 'string') {
      try {
        state.completed_sections = JSON.parse(currentSections);
      } catch {
        state.completed_sections = [];
      }
    } else if (!Array.isArray(currentSections)) {
      state.completed_sections = [];
    }

    const currentMeta = state.metadata;
    if (typeof currentMeta === 'string') {
      try {
        state.metadata = JSON.parse(currentMeta);
      } catch {
        state.metadata = {};
      }
    } else if (!currentMeta || typeof currentMeta !== 'object') {
      state.metadata = {};
    }

    return state;
  }

  /**
   * Update step and progress
   */
  static async updateStep(
    userId: string,
    householdId: string,
    step: string,
    completedSection?: string,
    metadata?: Record<string, any>
  ): Promise<OnboardingState> {
    const current = await this.getStatus(userId, householdId);

    const completed = new Set(current.completed_sections || []);
    if (completedSection) {
      completed.add(completedSection);
    }

    const mergedMetadata = {
      ...(current.metadata || {}),
      ...(metadata || {}),
    };

    const updated = await QueryHelper.queryOne<OnboardingState>(
      `UPDATE onboarding_progress
       SET current_step = $3,
           completed_sections = $4,
           metadata = $5,
           status = 'IN_PROGRESS',
           updated_at = NOW()
       WHERE user_id = $1 AND household_id = $2
       RETURNING *`,
      [userId, householdId, step, JSON.stringify(Array.from(completed)), JSON.stringify(mergedMetadata)]
    );

    if (!updated) {
      throw new Error('Failed to update onboarding state');
    }

    if (typeof updated.completed_sections === 'string') {
      updated.completed_sections = JSON.parse(updated.completed_sections);
    }
    if (typeof updated.metadata === 'string') {
      updated.metadata = JSON.parse(updated.metadata);
    }

    return updated;
  }

  /**
   * Mark onboarding as completed
   */
  static async completeOnboarding(userId: string, householdId: string): Promise<OnboardingState> {
    const updated = await QueryHelper.queryOne<OnboardingState>(
      `UPDATE onboarding_progress
       SET status = 'COMPLETED',
           completed_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1 AND household_id = $2
       RETURNING *`,
      [userId, householdId]
    );

    if (!updated) {
      throw new Error('Onboarding state not found');
    }

    if (typeof updated.completed_sections === 'string') {
      updated.completed_sections = JSON.parse(updated.completed_sections);
    }
    if (typeof updated.metadata === 'string') {
      updated.metadata = JSON.parse(updated.metadata);
    }

    return updated;
  }

  /**
   * Skip onboarding
   */
  static async skipOnboarding(userId: string, householdId: string): Promise<OnboardingState> {
    const updated = await QueryHelper.queryOne<OnboardingState>(
      `UPDATE onboarding_progress
       SET status = 'SKIPPED',
           completed_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1 AND household_id = $2
       RETURNING *`,
      [userId, householdId]
    );

    if (!updated) {
      throw new Error('Onboarding state not found');
    }

    if (typeof updated.completed_sections === 'string') {
      updated.completed_sections = JSON.parse(updated.completed_sections);
    }
    if (typeof updated.metadata === 'string') {
      updated.metadata = JSON.parse(updated.metadata);
    }

    return updated;
  }

  /**
   * Reset onboarding state
   */
  static async resetOnboarding(userId: string, householdId: string): Promise<OnboardingState> {
    const updated = await QueryHelper.queryOne<OnboardingState>(
      `UPDATE onboarding_progress
       SET status = 'IN_PROGRESS',
           current_step = 'bank_accounts',
           completed_sections = '[]'::jsonb,
           completed_at = NULL,
           updated_at = NOW()
       WHERE user_id = $1 AND household_id = $2
       RETURNING *`,
      [userId, householdId]
    );

    if (!updated) {
      throw new Error('Onboarding state not found');
    }

    return {
      ...updated,
      completed_sections: [],
      metadata: {},
    };
  }
}
