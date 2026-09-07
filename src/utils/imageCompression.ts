/**
 * GEBAT 360° ERP — Utilitaire de Compression d'Image Ultra-Optimisé
 * Redimensionne et compresse les images de profil pour un stockage ultra-léger (< 40 Ko)
 * garantissant une persistance inaltérable dans LocalStorage, IndexedDB et MySQL.
 */

export const compressImage = (
  file: File,
  maxWidth = 320,
  maxHeight = 320,
  quality = 0.82
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Échec de lecture du fichier image'));

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format d\'image non supporté'));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcul du ratio pour préserver les proportions et centrer / rogner en carré
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = width;
        let sourceHeight = height;

        if (width > height) {
          sourceX = (width - height) / 2;
          sourceWidth = height;
        } else if (height > width) {
          sourceY = (height - width) / 2;
          sourceHeight = width;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.min(maxWidth, sourceWidth);
        canvas.height = Math.min(maxHeight, sourceHeight);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );

        try {
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        } catch (err) {
          resolve(event.target?.result as string);
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};
