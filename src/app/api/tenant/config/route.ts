import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const tenant = getTenantFromRequest(request);
    
    if (!tenant) {
      return NextResponse.json({ 
        primary_color: '#3b82f6', 
        secondary_color: '#6366f1',
        logo_url: null 
      });
    }

    const { rows } = await pool.query(
      "SELECT primary_color, secondary_color, logo_url, config FROM public.tenants_config WHERE tenant = $1",
      [tenant]
    );

    if (rows.length === 0) {
      return NextResponse.json({ 
        primary_color: '#3b82f6', 
        secondary_color: '#6366f1',
        logo_url: null 
      });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
