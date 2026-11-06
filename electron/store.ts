import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  port: number;
}

export class ConfigStore {
  private filePath: string;
  private profile: UserProfile;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, 'profile_config.json');
    this.profile = this.load();
  }

  private load(): UserProfile {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to load profile config:', e);
    }

    // Default profile
    const defaultProfile: UserProfile = {
      id: uuidv4(),
      name: '',
      avatar: 'avatar-1',
      port: 41235
    };
    this.save(defaultProfile);
    return defaultProfile;
  }

  public getProfile(): UserProfile {
    return this.profile;
  }

  public save(profile: Partial<UserProfile>) {
    this.profile = { ...this.profile, ...profile };
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.profile, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save profile config:', e);
    }
  }
}
