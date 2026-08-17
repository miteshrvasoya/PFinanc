import { QueryHelper } from '../../database/queryHelper.js';
import { logAudit } from '../../utils/audit.js';

export interface CategoryNode {
  id: string;
  household_id: string | null;
  parent_category_id: string | null;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  is_system: boolean;
  is_active: boolean;
  children: CategoryNode[];
}

export class CategoriesService {
  static async listCategories(householdId: string): Promise<CategoryNode[]> {
    const categories = await QueryHelper.query(
      `SELECT id, household_id, parent_category_id, name, type, icon, color, is_system, is_active, created_at
       FROM categories
       WHERE (household_id = $1 OR is_system = true) AND is_active = true
       ORDER BY parent_category_id ASC NULLS FIRST, name ASC`,
      [householdId]
    );

    const map = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    categories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach((cat) => {
      const node = map.get(cat.id)!;
      if (cat.parent_category_id && map.has(cat.parent_category_id)) {
        map.get(cat.parent_category_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  static async createCategory(householdId: string, userId: string, data: any) {
    const category = await QueryHelper.insert('categories', {
      household_id: householdId,
      parent_category_id: data.parent_category_id || null,
      name: data.name,
      type: data.type,
      icon: data.icon || null,
      color: data.color || '#3b82f6',
      is_system: false,
      is_active: true,
    });

    await logAudit(householdId, userId, 'CATEGORY', category.id, 'CREATE', null, category);
    return category;
  }

  static async updateCategory(id: string, householdId: string, userId: string, data: any) {
    const old = await QueryHelper.queryOne(`SELECT * FROM categories WHERE id = $1 AND (household_id = $2 OR is_system = false)`, [id, householdId]);
    if (!old || old.is_system) {
      const error: any = new Error('Category not found or is a protected system category');
      error.status = 400;
      error.code = 'SYSTEM_CATEGORY_PROTECTED';
      throw error;
    }

    const updated = await QueryHelper.update('categories', id, data, 'household_id = $1', [householdId]);
    await logAudit(householdId, userId, 'CATEGORY', id, 'UPDATE', old, updated);
    return updated;
  }
}
