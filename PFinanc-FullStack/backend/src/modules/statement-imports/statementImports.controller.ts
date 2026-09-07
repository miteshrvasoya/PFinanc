import { Request, Response, NextFunction } from 'express';
import { StatementImportsService } from './statementImports.service.js';
import { AiAnalysisService } from './ai/aiAnalysis.service.js';
import { getHouseholdId, getParam } from '../../utils/request.js';

export class StatementImportsController {
  /**
   * Upload and deterministically parse CSV statement
   */
  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const userId = req.user!.id;
      const { account_id, column_mapping, allow_duplicate_file } = req.body;

      let filename = 'statement.csv';
      let csvContent = '';

      if (req.file) {
        filename = req.file.originalname;
        csvContent = req.file.buffer.toString('utf8');
      } else if (req.body.csv_content) {
        csvContent = req.body.csv_content;
        filename = req.body.filename || 'statement.csv';
      } else {
        return res.status(400).json({
          success: false,
          error: { code: 'FILE_REQUIRED', message: 'CSV file or csv_content is required.' },
        });
      }

      if (!account_id) {
        return res.status(400).json({
          success: false,
          error: { code: 'ACCOUNT_ID_REQUIRED', message: 'account_id is required.' },
        });
      }

      const customMapping = column_mapping
        ? typeof column_mapping === 'string'
          ? JSON.parse(column_mapping)
          : column_mapping
        : undefined;

      const result = await StatementImportsService.uploadAndParse(
        householdId,
        account_id,
        userId,
        filename,
        csvContent,
        {
          customMapping,
          allowDuplicateFile: Boolean(allow_duplicate_file),
        }
      );

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Start AI Analysis Run
   */
  static async startAiRun(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const importId = getParam(req, 'id');
      const userId = req.user!.id;
      const { model, chunk_size, force_mock, async_execution } = req.body;

      const result = await AiAnalysisService.createAnalysisRun(
        importId,
        householdId,
        userId,
        {
          model,
          chunkSize: chunk_size ? parseInt(chunk_size, 10) : undefined,
          forceMock: Boolean(force_mock),
          asyncExecution: async_execution !== undefined ? Boolean(async_execution) : true,
        }
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get statement import status
   */
  static async getImport(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const importId = getParam(req, 'id');
      const result = await StatementImportsService.getImport(importId, householdId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get paginated parsed source rows
   */
  static async getParsedRows(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const importId = getParam(req, 'id');
      const page = parseInt(String(req.query.page || '1'), 10);
      const limit = parseInt(String(req.query.limit || '100'), 10);
      const rowType = req.query.row_type ? String(req.query.row_type) : undefined;

      const result = await StatementImportsService.getParsedRows(
        importId,
        householdId,
        page,
        limit,
        rowType
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get consolidated review dataset
   */
  static async getReview(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const importId = getParam(req, 'id');
      const result = await StatementImportsService.getReviewData(importId, householdId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retry a failed AI chunk
   */
  static async retryChunk(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const chunkId = getParam(req, 'chunkId');
      const userId = req.user!.id;
      const { force_mock } = req.body;

      const result = await AiAnalysisService.retryChunk(
        chunkId,
        householdId,
        userId,
        { forceMock: Boolean(force_mock) }
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm import and commit to financial ledger
   */
  static async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const householdId = getHouseholdId(req);
      const importId = getParam(req, 'id');
      const userId = req.user!.id;
      const { include_duplicates, row_overrides } = req.body;

      const result = await StatementImportsService.confirmStatementImport(
        importId,
        householdId,
        userId,
        {
          includeDuplicates: Boolean(include_duplicates),
          rowOverrides: row_overrides,
        }
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
