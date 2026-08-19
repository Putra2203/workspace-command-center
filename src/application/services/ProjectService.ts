import { PlaneService } from '@/infrastructure/plane/PlaneClient';
import type { Project } from '@/domain/projects/project';

export class ProjectService {
  constructor(private planeService: PlaneService) {}

  async listProjects(): Promise<Project[]> {
    return this.planeService.listProjects();
  }
}
