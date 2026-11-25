import type { Pdf417Payload } from "./cedula";

type ReadBarcodesFn = typeof import("zxing-wasm/reader")["readBarcodes"];

let readerPromise: Promise<ReadBarcodesFn> | null = null;

async function getReader(): Promise<ReadBarcodesFn> {
  if (!readerPromise) {
    readerPromise = (async () => {
      const module = await import("zxing-wasm/reader");

      // El binario WASM se sirve localmente para que el escáner funcione
      // también en instalaciones sin acceso a Internet (redes LAN).
      module.prepareZXingModule({
        overrides: {
          locateFile: (path, prefix) =>
            path.endsWith(".wasm") ? "/zxing_reader.wasm" : prefix + path,
        },
      });

      return module.readBarcodes;
    })().catch((error) => {
      readerPromise = null;
      throw error;
    });
  }

  return readerPromise;
}

/**
 * Decodifica el código PDF417 de una imagen usando ZXing-C++ compilado a WASM.
 * Es el método más fiable para leer los datos de la cédula colombiana.
 */
export async function decodePdf417(
  input: Blob | ImageData | Uint8Array
): Promise<Pdf417Payload | null> {
  try {
    const readBarcodes = await getReader();
    const results = await readBarcodes(input, {
      formats: ["PDF417"],
      tryHarder: true,
      tryRotate: true,
      tryInvert: true,
      tryDownscale: true,
      maxNumberOfSymbols: 1,
      textMode: "Plain",
    });

    const result = results.find(
      (item) => item.isValid && item.bytes && item.bytes.length > 0
    );

    if (!result) return null;

    return {
      bytes: result.bytes,
      text: result.text || "",
    };
  } catch {
    return null;
  }
}
