import api from "@/lib/api/axios";
import type { SiteSettingsResponse } from "@/lib/site-config";

interface PublicProject {
  id: number;
  name: string;
  slug: string;
  short_description?: string | null;
}

export interface PublicHomepagePayload extends SiteSettingsResponse {
  projects: PublicProject[];
  blogs: unknown[];
  programs: unknown[];
}

const CACHE_TTL_MS = 30_000;

let siteConfigCache: { expiresAt: number; data: SiteSettingsResponse } | null = null;
let siteConfigPromise: Promise<SiteSettingsResponse> | null = null;

let projectsCache: { expiresAt: number; data: PublicProject[] } | null = null;
let projectsPromise: Promise<PublicProject[]> | null = null;

let homepageCache: { expiresAt: number; data: PublicHomepagePayload } | null = null;
let homepagePromise: Promise<PublicHomepagePayload> | null = null;

export async function getCachedHomepage(): Promise<PublicHomepagePayload> {
  const now = Date.now();
  if (homepageCache && homepageCache.expiresAt > now) {
    return homepageCache.data;
  }

  if (!homepagePromise) {
    homepagePromise = api
      .get<PublicHomepagePayload>("/homepage")
      .then((response) => {
        homepageCache = {
          expiresAt: Date.now() + CACHE_TTL_MS,
          data: response.data,
        };
        siteConfigCache = {
          expiresAt: Date.now() + CACHE_TTL_MS,
          data: {
            settings: response.data.settings,
            computed_homepage_stats: response.data.computed_homepage_stats,
          },
        };
        projectsCache = {
          expiresAt: Date.now() + CACHE_TTL_MS,
          data: Array.isArray(response.data.projects) ? response.data.projects : [],
        };
        return response.data;
      })
      .finally(() => {
        homepagePromise = null;
      });
  }

  return homepagePromise;
}

export async function getCachedSiteConfig(): Promise<SiteSettingsResponse> {
  const now = Date.now();
  if (siteConfigCache && siteConfigCache.expiresAt > now) {
    return siteConfigCache.data;
  }

  if (!siteConfigPromise) {
    siteConfigPromise = api
      .get<SiteSettingsResponse>("/site-config")
      .then((response) => {
        siteConfigCache = {
          expiresAt: Date.now() + CACHE_TTL_MS,
          data: response.data,
        };
        return response.data;
      })
      .finally(() => {
        siteConfigPromise = null;
      });
  }

  return siteConfigPromise;
}

export async function getCachedPublicProjects(): Promise<PublicProject[]> {
  const now = Date.now();
  if (projectsCache && projectsCache.expiresAt > now) {
    return projectsCache.data;
  }

  if (!projectsPromise) {
    projectsPromise = api
      .get<{ projects: PublicProject[] }>("/projects")
      .then((response) => {
        const projects = Array.isArray(response.data.projects) ? response.data.projects : [];
        projectsCache = {
          expiresAt: Date.now() + CACHE_TTL_MS,
          data: projects,
        };
        return projects;
      })
      .finally(() => {
        projectsPromise = null;
      });
  }

  return projectsPromise;
}
