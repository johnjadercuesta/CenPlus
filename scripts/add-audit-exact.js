const fs = require('fs');

function addLog(filePath, searchStr, replaceStr) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Success on", filePath);
  } else {
    console.log("Not found in", filePath);
  }
}

addLog(
  'src/app/api/ciudadanos/route.ts',
  'return NextResponse.json({ data, message: "Registro exitoso" }, { status: 201 });',
  `const { recordLog } = await import("@/lib/audit");
    if (tenant) {
      await recordLog({ tenant, email: token.email, nombre: token.nombre, modulo: "ciudadanos", accion: "Registró al ciudadano: " + data.nombre_completo });
    }
    return NextResponse.json({ data, message: "Registro exitoso" }, { status: 201 });`
);

addLog(
  'src/app/api/lideres/route.ts',
  'return NextResponse.json({ data: user, message: "Líder registrado correctamente" }, { status: 201 });',
  `const { recordLog } = await import("@/lib/audit");
    if (tenant) {
      await recordLog({ tenant, email: token.email, nombre: token.nombre, modulo: "lideres", accion: "Registró nuevo líder: " + body.nombre });
    }
    return NextResponse.json({ data: user, message: "Líder registrado correctamente" }, { status: 201 });`
);

addLog(
  'src/app/api/sectores/route.ts',
  'return NextResponse.json({ data, message: "Sector creado exitosamente" }, { status: 201 });',
  `const { recordLog } = await import("@/lib/audit");
    if (tenant) {
      await recordLog({ tenant, email: token.email, nombre: token.nombre, modulo: "sectores", accion: "Creó sector/meta: " + data.nombre });
    }
    return NextResponse.json({ data, message: "Sector creado exitosamente" }, { status: 201 });`
);
