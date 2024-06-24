import fg from "fast-glob";
import fs from "fs-extra";
import type { ListOptions } from "~/models/fs";
import { unwrapErrorMessage } from "~/utils/zodErrors";

export interface IDirectoryService {
  listDirectories(directory: string, options?: ListOptions): Promise<string[]>;
  createDirectory(directoryPath: string): Promise<void>;
  renameDirectory(oldPath: string, newPath: string): Promise<void>;
  moveDirectory(oldPath: string, newPath: string): Promise<void>;
  deleteDirectory(directoryPath: string): Promise<void>;
}

export class DirectoryService implements IDirectoryService {
  async listDirectories(directory: string, options: ListOptions = {}): Promise<string[]> {
    try {
      const patterns = options.includePatterns ?? ["*"];
      const ignore = options.excludePatterns ?? [];
      const directories: string[] = [];

      for (const pattern of patterns) {
        const entries = await fg(pattern, {
          cwd: directory,
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
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async createDirectory(directoryPath: string): Promise<void> {
    try {
      await fs.ensureDir(directoryPath);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async renameDirectory(oldPath: string, newPath: string): Promise<void> {
    try {
      await fs.rename(oldPath, newPath);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async moveDirectory(oldPath: string, newPath: string): Promise<void> {
    try {
      await fs.move(oldPath, newPath);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async deleteDirectory(directoryPath: string): Promise<void> {
    try {
      await fs.remove(directoryPath);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }
}
