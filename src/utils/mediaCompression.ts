export async function compressMediaFile(file: File): Promise<File> {
  // Si ce n'est pas une image (vidéo ou audio), on passe le fichier tel quel.
  if (!file.type.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      
      // On compresse à un maximum de 1200px (largement suffisant pour l'écran tout en réduisant 80% du poids)
      const MAX_SIZE = 1200;

      if (width > height && width > MAX_SIZE) {
        height *= MAX_SIZE / width;
        width = MAX_SIZE;
      } else if (height > MAX_SIZE) {
        width *= MAX_SIZE / height;
        height = MAX_SIZE;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // En cas de problème de mémoire navigateur, on renvoie l'original
        return resolve(file);
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Compression en format WebP avec 75% de qualité
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          
          // Reconstitution du type File avec la bonne extension
          const newFileName = file.name.replace(/\.[^/.]+$/, ".webp");
          const newFile = new File([blob], newFileName, {
            type: "image/webp",
            lastModified: Date.now(),
          });
          resolve(newFile);
        },
        "image/webp",
        0.75
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Si l'image n'est pas lisible, on tente d'envoyer l'original
    };

    img.src = url;
  });
}
