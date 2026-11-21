import { QueryHelper } from '../../database/queryHelper.js';
import { assertCategoryUsable } from '../../middleware/rbac.js';
import { pickFields } from '../../utils/object.js';
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

  /** Parent must be visible to the household and must not create a cycle. */
  private static async assertValidParent(householdId: string, parentId: string | null | undefined, selfId?: string) {
    if (!parentId) return;
    const fail = (message: string) => {
      const error: any = new Error(message);
      error.status = 400;
      error.code = 'INVALID_PARENT_CATEGORY';
      throw error;
    };
    if (parentId === selfId) fail('A category cannot be its own parent');
    await assertCategoryUsable(parentId, householdId);
    if (selfId) {
      const cycle = await QueryHelper.queryOne(
        `WITH RECURSIVE ancestors AS (
           SELECT id, parent_category_id FROM categories WHERE id = $1
           UNION ALL
           SELECT c.id, c.parent_category_id FROM categories c JOIN ancestors a ON c.id = a.parent_category_id
         )
         SELECT 1 FROM ancestors WHERE id = $2 LIMIT 1`,
        [parentId, selfId]
      );
      if (cycle) fail('This parent would create a category cycle');
    }
  }

  static async createCategory(householdId: string, userId: string, data: any) {
    await this.assertValidParent(householdId, data.parent_category_id);
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
    const old = await QueryHelper.queryOne(`SELECT * FROM categories WHERE id = $1 AND (household_id = $2 OR is_system = true)`, [id, householdId]);
    if (!old) {
      const error: any = new Error('Category not found');
      error.status = 404;
      error.code = 'CATEGORY_NOT_FOUND';
      throw error;
    }
    if (old.is_system) {
      const error: any = new Error('Category not found or is a protected system category');
      error.status = 400;
      error.code = 'SYSTEM_CATEGORY_PROTECTED';
      throw error;
    }

    if ('parent_category_id' in data) await this.assertValidParent(householdId, data.parent_category_id, id);
    const changes = pickFields(data, ['name', 'type', 'parent_category_id', 'icon', 'color']);
    const updated = await QueryHelper.update('categories', id, changes, 'household_id = $1', [householdId]);
    await logAudit(householdId, userId, 'CATEGORY', id, 'UPDATE', old, updated);
    return updated;
  }
}
