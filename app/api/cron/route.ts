import { NextResponse } from "next/server";

export const runtime = "nodejs";

function mustGet(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function fetchFRED(series: string) {
  const key = mustGet("FRED_API_KEY");
  const url =
    "https://api.stlouisfed.org/fred/series/observations" +
    `?series_id=${encodeURIComponent(series)}` +
    `&api_key=${encodeURIComponent(key)}` +
    `&file_type=json&sort_order=desc&limit=2`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`FRED ${series} HTTP ${r.status}`);
  const j = await r.json();
  const obs = j?.observations ?? [];
  const latest = obs[0];
  const prev = obs[1];
  return {
    date: latest?.date as string,
    value: Number(latest?.value),
    prevValue: Number(prev?.value),
  };
}

export async function GET(req: Request) {
  // 1) 간단한 크론 보호(아무나 호출 못하게)
  const secret = mustGet("CRON_SECRET");
  const got = new URL(req.url).searchParams.get("secret");
  if (got !== secret) return NextResponse.json({ ok: false }, { status: 401 });

  // 2) FRED 3개 가져오기
  const t10y2y = await fetchFRED("T10Y2Y");
  const unrate = await fetchFRED("UNRATE");
  const hyoas = await fetchFRED("BAMLH0A0HYM2");

  // 3) 시트에 저장 (Google Sheets)
  const b64 = mustGet("GOOGLE_SERVICE_ACCOUNT_JSON_B64");
  const sheetId = mustGet("SPREADSHEET_ID");

  const { GoogleSpreadsheet } = await import("google-spreadsheet");
  const credsJson = Buffer.from(b64, "base64").toString("utf8");
  const creds = JSON.parse(credsJson);

  const doc = new GoogleSpreadsheet(sheetId);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  // DATA 시트 이름을 "DATA"로 맞추세요
  const sheet = doc.sheetsByTitle["DATA"];
  if (!sheet) throw new Error('Sheet "DATA" not found');

  // YYYY-MM 기준으로 한 줄(일단 일단위도 같이 기록)
  const today = t10y2y.date; // FRED 최신 날짜
  await sheet.addRow({
    Date: today,
    T10Y2Y: t10y2y.value,
    UNRATE: unrate.value,
    HYOAS: hyoas.value
  });

  return NextResponse.json({
    ok: true,
    saved: { today, t10y2y, unrate, hyoas }
  });
}
