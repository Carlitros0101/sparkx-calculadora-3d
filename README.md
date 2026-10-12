# Mi taller 3D

Calculadora personal para Creality SPARKX i7 Combo, en pesos chilenos. App estática, sin servidor, cuentas ni dependencias externas. Los archivos G-code se leen en el dispositivo y los ajustes se guardan en el navegador.

## Uso

Ingresa tiempo y material del trabajo completo, cantidad de piezas obtenidas y purga adicional. Si el laminador ya incluye la purga y la torre en el peso total, no las vuelvas a sumar. El precio por pieza es el precio del lote dividido por las piezas obtenidas.

Incluye filamento, electricidad, preparación y terminaciones, recuperación del valor de impresora, mantenimiento, otros gastos, reserva por fallas, ganancia e IVA opcional. Puedes copiar, guardar o imprimir el resumen. La app puede funcionar sin conexión tras una primera visita en HTTPS.

## Valores iniciales

- Impresora: $399.990.
- Hyper PLA blanco, negro, azul, verde y amarillo: $13.990 por bobina; peso supuesto de 1.000 g, por confirmar.
- Electricidad: $249,56/kWh con IVA, tarifa de referencia de septiembre de 2026. Incluye consumo, transporte y fondo de estabilización. Excluye administración, arriendo de medidor, intereses, ajustes de pago y subsidios.
- Consumo promedio: 100 W, estimación editable; no es una medición ni la potencia nominal del equipo.
- Recuperación de compra: 3.000 horas, supuesto editable; desactivada por defecto.
- Recargo sobre costo: 30 %, editable; no es una recomendación comercial.

## Cálculos

Electricidad = horas × W / 1.000 × CLP/kWh. Material = gramos × precio de bobina / peso neto. La reserva por fallas se aplica al material, purga, electricidad y uso de máquina; no a trabajo manual u otros gastos. No representa una probabilidad estadística.

Recargo: precio neto = costo × (1 + porcentaje). Margen sobre venta: precio neto = costo / (1 - porcentaje), con porcentaje menor que 100 %. IVA opcional se agrega al precio neto. Los costos son desembolsos brutos; no se realiza tratamiento de crédito fiscal. Los resultados se calculan sin redondear y se muestran en pesos enteros.

Importación de G-code: reconoce encabezados explícitos de tiempo y gramos. No convierte metros en gramos ni interpreta G-code binario. Si un encabezado no se reconoce, ingresa el dato manualmente y verifica el resultado contra el laminador.

## GitHub Pages

En Settings → Pages, selecciona Deploy from a branch, la rama main y la carpeta / (root). Todos los archivos se sirven desde rutas relativas, compatibles con un repositorio de GitHub Pages.

## Desarrollo

Sirve esta carpeta con cualquier servidor estático. Para comprobar los cálculos: `node --test tests/calculator.test.cjs`. No se necesita instalar paquetes.

No se incluyen boletas ni datos personales en el repositorio.

## Historial y Excel

Guardar trabajo crea un registro independiente con fecha y valores. La base se guarda solo en localStorage de ese navegador y no se sincroniza entre dispositivos. Excel puede exportar un trabajo o toda la base como .xlsx real, con números tipados, filtro y encabezado congelado. Los importes históricos son valores, no fórmulas que cambien al modificar precios futuros.

Descargar respaldo genera un archivo JSON. Restaurar respaldo valida sus registros y los combina por ID sin duplicados. Excel sirve para consulta y registro externo; la restauración en la app utiliza el respaldo JSON. Borrar datos del navegador elimina el historial local, por lo que conviene guardar respaldos periódicos.

Diseño personal inspirado en el verde, negro y blanco de Creality; no es una app oficial. No utiliza librerías de Excel ni conexiones externas para exportar.

## Importación de fichas públicas

MakerWorld, Printables y Thingiverse: lectura mediante Jina Reader sin clave. Se envía únicamente la URL pública normalizada, sin parámetros de seguimiento ni credenciales. Nombre y autor se importan; tiempo/peso de perfiles requieren selección y aplicación explícitas, quedan marcados como referencia y se exportan con su origen a Excel. STL y 3MF se cargan por separado en Calcula desde tu archivo 3D. El ID de perfil del enlace se conserva pero no se presume su correspondencia con la lista leída. Si hay CAPTCHA, bloqueo, límite o campos ausentes, el usuario puede pegar texto público o ingresar sus valores de Creality Print. No hay garantía de lectura en todas las fichas ni de permanencia del servicio externo.

## Carga de STL y 3MF

La carga local completa gramos y tiempo y recalcula costo y venta con tus precios. STL binario y ASCII: unidades en milímetros. 3MF: unidades, objetos, instancias, transformaciones y componentes externos incluidos en el archivo. Los resultados en Metadata/slice_info.config de Creality Print se muestran por placa; selecciona la placa a cotizar. Solo se usan placas con tiempo y peso positivos explícitos. El peso total importado deja la purga adicional en cero. No se presume que un perfil de otro equipo corresponde a la SPARKX.

Sin resultados de laminado, se estima: volumen de paredes/tapas ≈ área superficial × espesor, limitado por el volumen sólido; interior × relleno; soportes como porcentaje adicional. Peso = volumen de plástico × densidad. Tiempo = volumen / flujo efectivo × factor de movimientos + 5 minutos. La escala modifica volumen, área y dimensiones. Son supuestos editables; requieren mallas cerradas y orientación consistente. No sustituye laminar en Creality Print ni modela aceleración, refrigeración o cambios de color. Purga multicolor se ingresa por separado. Los datos conservan su origen y ajustes en historial, resumen y Excel.

Máximo 100 MB y un millón de triángulos. 3MF necesita un navegador con DecompressionStream deflate-raw (Chrome/Edge actuales). Archivos cifrados, ZIP64, XML con entidades y modelos incompletos no son compatibles.

Pruebas: node --test tests/*.test.cjs.

## Cotizaciones para imprimir

Imprimir cotización / PDF genera un documento A4 con taller, contacto, cliente, número, fecha, validez, entrega, servicio, cantidad, precio neto unitario, subtotal, IVA opcional, total y precio final por pieza. Incluye material, tiempo, procedencia y observaciones. El desglose de costos y ganancia se puede ocultar al enviar al cliente. Ver cotización muestra el documento antes de imprimir. Número y fecha se asignan al preparar la cotización si están vacíos; son editables y se conservan con cada trabajo. El historial previo sigue siendo compatible.

## Revisión de datos y configuración

Se distingue cotización estimada, datos manuales y datos de laminador. Si se modifica un dato confirmado, vuelve a origen Manual. El usuario puede marcar tiempo y gramos revisados contra Creality Print; esto es una declaración manual, no una conexión al laminador. Una importación parcial de G-code señala como pendientes los datos conservados. Los 3MF permiten sumar todas las placas con resultados completos o elegir una; las placas sin resultados reconocidos no se incluyen en la suma. La geometría sin resultados representa todo el proyecto y sus dimensiones son la extensión de sus objetos, no una pieza o placa individual.

Mantenimiento inicial: $100/h como presupuesto hipotético editable, cobrado solo al activar uso de impresora. Los valores existentes no cambian al actualizar. El botón de reserva provisional aplica el valor explícitamente. Se muestran costo de mantenimiento del trabajo y margen efectivo sobre venta. Nueva cotización conserva los cálculos pero vacía cliente, observaciones, entrega, número y fecha para evitar reutilizar datos del pedido anterior.

## Gestión del taller: 15 mejoras

1. Registrar tiempo, gramos y costo reales por pedido para comparar con su previsión.
2. Guardar bobinas por material/color, densidad y precio.
3. Distribuir piezas y purga por bobina con precios independientes.
4. Precio mínimo neto por producto/trabajo, antes del IVA opcional.
5. Embalaje y despacho separados, incluidos en la base del recargo/margen.
6. Historial de mantenimiento y reserva según gasto dividido por contador de horas de un mismo período.
7. Stock restante, aviso de stock bajo/insuficiente y descuento al registrar impresión terminada. El descuento es idempotente: no se aplica dos veces.
8. Cotización con varios productos y condiciones de cada línea. Evita repetir despacho en todas las líneas de una entrega conjunta.
9. Clientes con contacto y búsqueda de pedidos anteriores.
10. Estados cotizado, aceptado, pendiente de pago, en impresión, terminado, entregado y cancelado.
11. Registro manual de abonos, saldo y excedente; no realiza pagos o transferencias.
12. Logo PNG/JPG/WebP (hasta 250 KB), color y condiciones en el PDF generado mediante impresión del navegador. El número de cotización se usa en el título de impresión.
13. Cola estimada de una impresora según horas disponibles al día. No descuenta pausas, fallas o tiempo ya ejecutado.
14. Resumen por mes de creación del pedido, con ventas netas comprometidas, costos reales o previstos, abonos y horas. Excluye cotizaciones sin aceptar y cancelados. Exportación de pedidos a Excel.
15. Taller privado con inicio de sesión de ChatGPT y respaldo sincronizado por usuario.

## PC y celular

La calculadora pública sigue en GitHub Pages. Sus datos son locales a cada navegador. El taller privado está en https://carlitros3d-taller.carlitrosparra96.chatgpt.site y requiere la misma cuenta de ChatGPT en PC y celular. La sincronización es explícita: Guardar datos locales en la nube después de editar; Traer datos de la nube antes de continuar en otro equipo. Si otro dispositivo modificó la nube, se rechaza una escritura basada en una versión anterior. No se sobrescribe silenciosamente.

Para trasladar tus datos de GitHub: Respaldar taller completo → entrar al taller privado → Restaurar respaldo del taller → Guardar datos locales en la nube. El respaldo contiene taller, clientes, pedidos, bobinas, marca, cotización en preparación, ajustes de la calculadora e historial anterior. La restauración reemplaza los datos locales tras validar y conserva una copia recuperable. Los archivos de modelo STL/3MF no se sincronizan ni se suben. La nube tiene un límite de 2 MB por respaldo del taller.

## Límites de resultados reales

El cálculo automático de costo real reparte el peso y tiempo reales proporcionalmente entre productos y colores y elimina la reserva por fallas. Si cambió la composición de materiales o hubo otros gastos, ingresa el costo real total. Ajusta manualmente el stock si la distribución real por color fue diferente. El descuento automático requiere vincular una bobina al cálculo o usar la distribución multicolor antes de crear el pedido. Cambiar precios de bobinas no modifica las cotizaciones ya guardadas.
