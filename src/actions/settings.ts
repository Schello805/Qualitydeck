'use server';

import { writeFile, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';

export async function uploadLogo(formData: FormData) {
  const file = formData.get('logo') as File;
  
  if (!file || file.size === 0) {
    return { error: 'Bitte wähle eine Datei aus.' };
  }

  try {
    const publicDir = join(process.cwd(), 'public');
    
    // Delete existing logo files
    const files = await readdir(publicDir);
    const existingLogos = files.filter(f => f.startsWith('logo.'));
    for (const f of existingLogos) {
      await unlink(join(publicDir, f));
    }

    // Get original extension
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save with new extension
    const path = join(publicDir, `logo.${ext}`);
    await writeFile(path, buffer);

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error("Error uploading logo:", error);
    return { error: 'Fehler beim Hochladen des Logos.' };
  }
}

import { prisma } from '@/lib/prisma';

export async function getSettings() {
  const settings = await prisma.setting.findMany();
  const obj: Record<string, string> = {};
  for (const s of settings) {
    obj[s.key] = s.value;
  }
  return obj;
}

export async function saveSettings(data: Record<string, string>) {
  try {
    for (const [key, value] of Object.entries(data)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Error saving settings:", error);
    return { error: 'Fehler beim Speichern der Einstellungen.' };
  }
}
