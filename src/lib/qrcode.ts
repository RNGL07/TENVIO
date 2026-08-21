import "server-only";
import QRCode from "qrcode";

/** Renders a URL to a QR code as a data: URL PNG, usable directly in an <img src>
 * or downloaded client-side via an anchor tag with a download attribute. */
export async function qrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    // Standard 4-module quiet zone, opaque white backing (not transparent) —
    // these QR codes get placed on arbitrary backgrounds (printed table
    // tents, screenshots, dark UI cards), and a transparent/thin-margin
    // code is a real scan-reliability risk on anything but a plain white
    // surface.
    margin: 4,
    width: 480,
    color: { dark: "#181614", light: "#ffffffff" },
  });
}
