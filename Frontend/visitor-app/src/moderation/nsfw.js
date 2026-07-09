// Client-side adult/NSFW image screening using nsfwjs (TensorFlow.js). The model is loaded lazily
// on first use (downloaded once, then cached). Best-effort: if the model can't load, callers treat
// the image as allowed rather than blocking legitimate work.

let modelPromise

async function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const nsfwjs = await import('nsfwjs')
      return nsfwjs.load()
    })()
  }
  return modelPromise
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

/**
 * Classify an image File. Returns { blocked, scores }.
 * Blocks when Porn+Hentai is high, or Sexy is very high. Throws if the model is unavailable.
 */
export async function checkImageNsfw(file) {
  const model = await getModel()
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const preds = await model.classify(img)
    const p = {}
    preds.forEach((x) => {
      p[x.className] = x.probability
    })
    const adult = (p.Porn || 0) + (p.Hentai || 0)
    const sexy = p.Sexy || 0
    const blocked = adult > 0.6 || sexy > 0.85
    return { blocked, scores: p }
  } finally {
    URL.revokeObjectURL(url)
  }
}
