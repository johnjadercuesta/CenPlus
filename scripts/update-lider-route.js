const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/api/lideres/[id]/route.ts');

if (!fs.existsSync(filePath)) {
  console.error("Archivo no encontrado:", filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf-8');

const target = `    if (body.email !== undefined) {
      const { rows: existingRows } = await run(
        "SELECT id FROM admins WHERE email = $1 AND id != $2",
        [body.email, id]
      );
      if (existingRows.length > 0) {
        return NextResponse.json({ error: "Email ya en uso" }, { status: 409 });
      }
      fields.push(\`email = $\${pCount++}\`);
      values.push(body.email);
    }`;

const replacement = `    if (body.email !== undefined) {
      const { rows: existingRows } = await run(
        "SELECT id FROM admins WHERE email = $1 AND id != $2",
        [body.email, id]
      );
      if (existingRows.length > 0) {
        return NextResponse.json({ error: "Email ya en uso" }, { status: 409 });
      }
      fields.push(\`email = $\${pCount++}\`);
      values.push(body.email);
    }
    if (body.identificacion !== undefined) {
      const { rows: existingRows } = await run(
        "SELECT id FROM admins WHERE identificacion = $1 AND id != $2",
        [body.identificacion, id]
      );
      if (existingRows.length > 0) {
        return NextResponse.json({ error: "Identificación ya en uso" }, { status: 409 });
      }
      fields.push(\`identificacion = $\${pCount++}\`);
      values.push(body.identificacion);
    }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log("✅ Archivo actualizado correctamente.");
} else {
  console.error("❌ No se encontró el texto objetivo en el archivo.");
  console.log("Contenido del archivo (primeros 500 caracteres):");
  console.log(content.substring(0, 500));
}
