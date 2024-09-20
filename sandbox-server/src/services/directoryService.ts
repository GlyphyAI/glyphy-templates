import fg from "fast-glob";
import fs from "fs-extra";

import { DirectoryError } from "~/errors";

import type { ListOptions } from "~/models/fs";

export interface IDirectoryService {
  listDirectories(path: string, options?: ListOptions): Promise<string[]>;
  createDirectory(path: string): Promise<void>;
  renameDirectory(oldPath: string, newPath: string): Promise<void>;
  moveDirectory(oldPath: string, newPath: string): Promise<void>;
  deleteDirectory(path: string): Promise<void>;
}

export class DirectoryService implements IDirectoryService {
  async listDirectories(path: string, options: ListOptions = {}): Promise<string[]> {
    try {
      if (!(await fs.pathExists(path))) {
        throw new Error(`Directory '${path}' does not exist`);
      }

      const patterns = options.includePatterns ?? ["**/*"];
      const ignore = options.excludePatterns ?? [];
      const directories: string[] = [];

      for (const pattern of patterns) {
        const entries = await fg(pattern, {
          cwd: path,
          onlyDirectories: true,
          absolute: true,
          dot: true,
          ignore,
          deep: options.recursive ? Infinity : 1,
        });

        directories.push(...entries);
      }

      return directories;
    } catch (error) {
      throw DirectoryError.fromError(error, {
        defaultErrorCode: "DIRECTORY_LIST_ERROR",
        defaultErrorMessage: "Failed to list directories",
        additionalDetails: { path, options },
      });
    }
  }

  async createDirectory(path: string): Promise<void> {
    try {
      if (await fs.pathExists(path)) {
        throw new Error(`Directory '${path}' already exists`);
      }

      await fs.ensureDir(path);
    } catch (error) {
      throw DirectoryError.fromError(error, {
        defaultErrorCode: "DIRECTORY_CREATE_ERROR",
        defaultErrorMessage: "Failed to create directory",
        additionalDetails: { path },
      });
    }
  }

  async renameDirectory(oldPath: string, newPath: string): Promise<void> {
    try {
      await fs.rename(oldPath, newPath);
    } catch (error) {
      throw DirectoryError.fromError(error, {
        defaultErrorCode: "DIRECTORY_RENAME_ERROR",
        defaultErrorMessage: "Failed to rename directory",
        additionalDetails: { oldPath, newPath },
      });
    }
  }

  async moveDirectory(oldPath: string, newPath: string): Promise<void> {
    try {
      await fs.move(oldPath, newPath);
    } catch (error) {
      throw DirectoryError.fromError(error, {
        defaultErrorCode: "DIRECTORY_MOVE_ERROR",
        defaultErrorMessage: "Failed to move directory",
        additionalDetails: { oldPath, newPath },
      });
    }
  }

  async deleteDirectory(path: string): Promise<void> {
    try {
      if (!(await fs.pathExists(path))) {
        throw new Error(`Directory '${path}' does not exist`);
      }

      await fs.remove(path);
    } catch (error) {
      throw DirectoryError.fromError(error, {
        defaultErrorCode: "DIRECTORY_DELETE_ERROR",
        defaultErrorMessage: "Failed to delete directory",
        additionalDetails: { path },
      });
    }
  }
}
