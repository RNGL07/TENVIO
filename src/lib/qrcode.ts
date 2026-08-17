import "server-only";
import QRCode from "qrcode";

/** Renders a URL to a QR code as a data: URL PNG, usable directly in an <img src>
 * or downloaded client-side via an anchor tag with a download attribute. */
export async function qrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 480,
    color: { dark: "#181614", light: "#00000000" },
  });
}
