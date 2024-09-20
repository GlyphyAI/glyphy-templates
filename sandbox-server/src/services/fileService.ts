import fg from "fast-glob";
import fs from "fs-extra";

import { FileError } from "~/errors";

import type { ListOptions } from "~/models/fs";

export interface FileOperation {
  path: string;
  content?: string;
}

export interface MoveOperation {
  oldPath: string;
  newPath: string;
}

export interface IFileService {
  listFiles(path: string, options?: ListOptions): Promise<string[]>;
  readFiles(files: FileOperation[]): Promise<FileOperation[]>;
  updateFiles(files: FileOperation[]): Promise<void>;
  deleteFiles(files: FileOperation[]): Promise<void>;
  moveFiles(operations: MoveOperation[]): Promise<void>;
  renameFiles(operations: MoveOperation[]): Promise<void>;
}

export class FileService implements IFileService {
  async listFiles(path: string, options: ListOptions = {}): Promise<string[]> {
    try {
      const patterns = options.includePatterns ?? ["**/*"];
      const ignore = options.excludePatterns ?? [];
      const files: string[] = [];

      for (const pattern of patterns) {
        const entries = await fg(pattern, {
          cwd: path,
          onlyFiles: true,
          absolute: true,
          dot: true,
          ignore,
          deep: options.recursive ? Infinity : 1,
        });

        files.push(...entries);
      }

      return files;
    } catch (error) {
      throw FileError.fromError(error, {
        defaultErrorCode: "FILE_OPERATION_ERROR",
        defaultErrorMessage: "An error occurred during file operation",
        additionalDetails: { path, options },
      });
    }
  }

  async readFiles(files: FileOperation[]): Promise<FileOperation[]> {
    try {
      return await Promise.all(
        files.map(async (file) => {
          try {
            return {
              path: file.path,
              content: await fs.readFile(file.path, "utf-8"),
            };
          } catch (error) {
            throw FileError.fromError(error, {
              defaultErrorCode: "FILE_OPERATION_ERROR",
              defaultErrorMessage: "An error occurred during file operation",
              additionalDetails: { path: file.path },
            });
          }
        }),
      );
    } catch (error) {
      if (error instanceof FileError) {
        throw error;
      }

      throw FileError.fromError(error, {
        defaultErrorCode: "FILE_OPERATION_ERROR",
        defaultErrorMessage: "An error occurred during file operation",
        additionalDetails: { files },
      });
    }
  }

  async updateFiles(files: FileOperation[]): Promise<void> {
    try {
      await Promise.all(
        files.map(async (file) => {
          try {
            await fs.outputFile(file.path, file.content ?? "");
          } catch (error) {
            throw FileError.fromError(error, {
              defaultErrorCode: "FILE_OPERATION_ERROR",
              defaultErrorMessage: "An error occurred during file operation",
              additionalDetails: { path: file.path },
            });
          }
        }),
      );
    } catch (error) {
      if (error instanceof FileError) {
        throw error;
      }

      throw FileError.fromError(error, {
        defaultErrorCode: "FILE_OPERATION_ERROR",
        defaultErrorMessage: "An error occurred during file operation",
        additionalDetails: { files },
      });
    }
  }

  async deleteFiles(files: FileOperation[]): Promise<void> {
    try {
      await Promise.all(
        files.map(async (file) => {
          try {
            await fs.unlink(file.path);
          } catch (error) {
            throw FileError.fromError(error, {
              defaultErrorCode: "FILE_OPERATION_ERROR",
              defaultErrorMessage: "An error occurred during file operation",
              additionalDetails: { path: file.path },
            });
          }
        }),
      );
    } catch (error) {
      if (error instanceof FileError) {
        throw error;
      }
      throw FileError.fromError(error, {
        defaultErrorCode: "FILE_OPERATION_ERROR",
        defaultErrorMessage: "An error occurred during file operation",
        additionalDetails: { files },
      });
    }
  }

  async moveFiles(operations: MoveOperation[]): Promise<void> {
    try {
      await Promise.all(
        operations.map(async (op) => {
          try {
            await fs.move(op.oldPath, op.newPath);
          } catch (error) {
            throw FileError.fromError(error, {
              defaultErrorCode: "FILE_OPERATION_ERROR",
              defaultErrorMessage: "An error occurred during file operation",
              additionalDetails: { oldPath: op.oldPath, newPath: op.newPath },
            });
          }
        }),
      );
    } catch (error) {
      if (error instanceof FileError) {
        throw error;
      }
      throw FileError.fromError(error, {
        defaultErrorCode: "FILE_OPERATION_ERROR",
        defaultErrorMessage: "An error occurred during file operation",
        additionalDetails: { operations },
      });
    }
  }

  async renameFiles(operations: MoveOperation[]): Promise<void> {
    try {
      await Promise.all(
        operations.map(async (op) => {
          try {
            await fs.rename(op.oldPath, op.newPath);
          } catch (error) {
            throw FileError.fromError(error, {
              defaultErrorCode: "FILE_OPERATION_ERROR",
              defaultErrorMessage: "An error occurred during file operation",
              additionalDetails: { oldPath: op.oldPath, newPath: op.newPath },
            });
          }
        }),
      );
    } catch (error) {
      if (error instanceof FileError) {
        throw error;
      }
      throw FileError.fromError(error, {
        defaultErrorCode: "FILE_OPERATION_ERROR",
        defaultErrorMessage: "An error occurred during file operation",
        additionalDetails: { operations },
      });
    }
  }
}
