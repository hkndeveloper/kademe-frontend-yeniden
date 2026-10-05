"use client";
import { useEffect, useState } from 'react';
import { getCachedHomepage } from '@/lib/public-api-cache';
import api from '@/lib/api/axios';
import { defaultSiteSettings, type SiteSettingsPayload } from '@/lib/site-config';
import { resolveTheme } from '@/lib/aigocy';

export type ThemeProject = {id:number; name:string; slug:string; description?:string; short_description?:string; cover_image?:string|null; is_application_open?:boolean; active_period?:{name:string}|null; type?:string; status?:string};
export type ThemeActivity = {id:number; title:string; description?:string; start_at:string; end_at?:string; cover_image?:string|null; location?:string; status?:string; project?:{id:number;name:string;slug:string}};
export type ThemeBlog = {id:number;title:string;slug:string;cover_image?:string|null;excerpt?:string;summary?:string;content?:string;published_at?:string;category?:string|{name:string}};
export type ThemeFaq = {id:number;question:string;answer:string;category?:string};
export function mergePublicSettings(settings?: SiteSettingsPayload):SiteSettingsPayload {
  return {...defaultSiteSettings,...settings,
    general:{...defaultSiteSettings.general,...settings?.general},
    contact:{...defaultSiteSettings.contact,...settings?.contact},
    navigation:{...defaultSiteSettings.navigation,...settings?.navigation},
    homepage:{...defaultSiteSettings.homepage,...settings?.homepage,block_visibility:{...defaultSiteSettings.homepage.block_visibility,...settings?.homepage?.block_visibility}},
    about:{...defaultSiteSettings.about,...settings?.about},
    blog_page:{...defaultSiteSettings.blog_page,...settings?.blog_page},
    faq_page:{...defaultSiteSettings.faq_page,...settings?.faq_page},
    theme:resolveTheme(settings?.theme),
  };
}
export function usePublicContent() {
  const [content,setContent] = useState({settings:mergePublicSettings(),projects:[] as ThemeProject[],activities:[] as ThemeActivity[],blogs:[] as ThemeBlog[],faqs:[] as ThemeFaq[],stats:[] as {label:string;value:string;icon:string}[]});
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [attempt,setAttempt] = useState(0);
  useEffect(()=>{
    let active=true;
    void Promise.all([getCachedHomepage(),api.get<{faqs:Record<string,ThemeFaq[]>}>('/faqs').catch(()=>null)]).then(([payload,faqResponse])=>{
      if(!active)return;
      const settings=mergePublicSettings(payload.settings);
      setContent({settings,projects:payload.projects as ThemeProject[],activities:payload.programs as ThemeActivity[],blogs:payload.blogs as ThemeBlog[],faqs:Object.entries(faqResponse?.data.faqs||{}).flatMap(([category,items])=>items.map(item=>({...item,category}))),stats:settings.homepage.stats_mode==='manual'?settings.homepage.stats:payload.computed_homepage_stats||[]});
      setError('');
    }).catch(()=>{if(active)setError('İçerikler yüklenemedi. Lütfen tekrar deneyin.');}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[attempt]);
  return {...content,loading,error,retry:()=>{setLoading(true);setAttempt(a=>a+1);}};
}
