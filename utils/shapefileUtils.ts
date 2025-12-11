import JSZip from 'jszip';
import { Coordinate } from '../types';

/**
 * A minimal Shapefile writer for Polygon geometry.
 * Reference: ESRI Shapefile Technical Description
 */

// Helper to write binary data
const writeString = (view: DataView, offset: number, str: string, length: number) => {
  for (let i = 0; i < length; i++) {
    view.setUint8(offset + i, i < str.length ? str.charCodeAt(i) : 0);
  }
};

const writeDoubleLE = (view: DataView, offset: number, val: number) => {
  view.setFloat64(offset, val, true);
};

const writeInt32LE = (view: DataView, offset: number, val: number) => {
  view.setInt32(offset, val, true);
};

const writeInt32BE = (view: DataView, offset: number, val: number) => {
  view.setInt32(offset, val, false);
};

export const generateShapefileZip = async (points: Coordinate[], filename: string) => {
  if (points.length < 3) throw new Error("Need at least 3 points for a polygon");

  // Ensure closure
  const coords = [...points];
  if (coords[0].lat !== coords[coords.length - 1].lat || coords[0].lng !== coords[coords.length - 1].lng) {
    coords.push(coords[0]);
  }
  
  const nPoints = coords.length;
  // Calculate Bounding Box
  let xmin = 180, ymin = 90, xmax = -180, ymax = -90;
  coords.forEach(p => {
    if (p.lng < xmin) xmin = p.lng;
    if (p.lng > xmax) xmax = p.lng;
    if (p.lat < ymin) ymin = p.lat;
    if (p.lat > ymax) ymax = p.lat;
  });

  // --- 1. SHP File ---
  // Header: 100 bytes
  // Record Header: 8 bytes
  // Record Content: 4 (Type) + 32 (Box) + 4 (NumParts) + 4 (NumPoints) + 4 (Parts) + 16 * nPoints (Points)
  // Total Record Content Length = 44 + 4 + 16 * nPoints
  const recordContentLength = 48 + 16 * nPoints;
  const fileLengthBytes = 100 + 8 + recordContentLength;
  const fileLengthWords = fileLengthBytes / 2;

  const shpBuffer = new ArrayBuffer(fileLengthBytes);
  const shpView = new DataView(shpBuffer);

  // File Header
  writeInt32BE(shpView, 0, 9994); // File Code
  writeInt32BE(shpView, 24, fileLengthWords); // File Length
  writeInt32LE(shpView, 28, 1000); // Version
  writeInt32LE(shpView, 32, 5); // Shape Type (5 = Polygon)
  writeDoubleLE(shpView, 36, xmin);
  writeDoubleLE(shpView, 44, ymin);
  writeDoubleLE(shpView, 52, xmax);
  writeDoubleLE(shpView, 60, ymax);

  // Record Header
  writeInt32BE(shpView, 100, 1); // Record Number
  writeInt32BE(shpView, 104, recordContentLength / 2); // Content Length in Words

  // Record Content
  const rStart = 108;
  writeInt32LE(shpView, rStart, 5); // Shape Type (Polygon)
  writeDoubleLE(shpView, rStart + 4, xmin); // Box
  writeDoubleLE(shpView, rStart + 12, ymin);
  writeDoubleLE(shpView, rStart + 20, xmax);
  writeDoubleLE(shpView, rStart + 28, ymax);
  writeInt32LE(shpView, rStart + 36, 1); // NumParts
  writeInt32LE(shpView, rStart + 40, nPoints); // NumPoints
  writeInt32LE(shpView, rStart + 44, 0); // Parts (Start index of part 0)

  // Points
  for (let i = 0; i < nPoints; i++) {
    const pOffset = rStart + 48 + (i * 16);
    writeDoubleLE(shpView, pOffset, coords[i].lng); // X
    writeDoubleLE(shpView, pOffset + 8, coords[i].lat); // Y
  }

  // --- 2. SHX File (Index) ---
  const shxLengthBytes = 100 + 8; // Header + 1 Record
  const shxBuffer = new ArrayBuffer(shxLengthBytes);
  const shxView = new DataView(shxBuffer);

  // Header (Mostly same as SHP)
  writeInt32BE(shxView, 0, 9994);
  writeInt32BE(shxView, 24, shxLengthBytes / 2);
  writeInt32LE(shxView, 28, 1000);
  writeInt32LE(shxView, 32, 5);
  writeDoubleLE(shxView, 36, xmin);
  writeDoubleLE(shxView, 44, ymin);
  writeDoubleLE(shxView, 52, xmax);
  writeDoubleLE(shxView, 60, ymax);

  // Index Record
  writeInt32BE(shxView, 100, 50); // Offset (in words) to record in SHP (100 bytes / 2 = 50)
  writeInt32BE(shxView, 104, recordContentLength / 2); // Content Length

  // --- 3. DBF File (Attributes) ---
  // Minimal DBF with one column "ID"
  // Header: 32 bytes + 32 bytes (Field Descriptor) + 1 byte (Terminator)
  const recordCount = 1;
  const headerLen = 32 + 32 + 1; 
  const recordLen = 1 + 10; // Deletion flag + Field width
  const dbfLength = headerLen + (recordCount * recordLen) + 1; // +1 for EOF
  
  const dbfBuffer = new ArrayBuffer(dbfLength);
  const dbfView = new DataView(dbfBuffer);
  
  // Header
  dbfView.setUint8(0, 0x03); // Version (dBASE III)
  const now = new Date();
  dbfView.setUint8(1, now.getFullYear() - 1900);
  dbfView.setUint8(2, now.getMonth() + 1);
  dbfView.setUint8(3, now.getDate());
  writeInt32LE(dbfView, 4, recordCount);
  dbfView.setUint16(8, headerLen, true);
  dbfView.setUint16(10, recordLen, true);

  // Field Descriptor: "ID" (Numeric)
  writeString(dbfView, 32, "ID", 10);
  dbfView.setUint8(32 + 11, 0x4E); // Type 'N' (Numeric)
  dbfView.setUint8(32 + 16, 10); // Length
  dbfView.setUint8(32 + 17, 0); // Decimals

  // Header Terminator
  dbfView.setUint8(64, 0x0D);

  // Record 1
  dbfView.setUint8(65, 0x20); // Valid record (space)
  writeString(dbfView, 66, "1", 10); // Value "1"

  // EOF
  dbfView.setUint8(headerLen + recordLen, 0x1A);

  // --- 4. PRJ File ---
  const prjContent = `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]`;

  // --- Zip It ---
  const zip = new JSZip();
  zip.file(`${filename}.shp`, shpBuffer);
  zip.file(`${filename}.shx`, shxBuffer);
  zip.file(`${filename}.dbf`, dbfBuffer);
  zip.file(`${filename}.prj`, prjContent);

  const content = await zip.generateAsync({ type: "blob" });
  return content;
};
