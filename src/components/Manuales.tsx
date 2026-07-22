import React, { useState } from 'react';
import { User } from '../types';
import { logoBase64 } from '../assets/images/logoBase64';
import { 
  BookOpen, 
  Download, 
  User as UserIcon, 
  FileText, 
  CheckSquare, 
  BarChart3, 
  Settings, 
  Building2, 
  Users, 
  Info, 
  ArrowRight,
  FileDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Returns beautiful inline-styled HTML mockups for exports
function getExportMockupHtml(type: string): string {
  let innerHtml = '';
  let title = 'Plataforma Conciliaria DEGRES — Captura Digital';

  switch (type) {
    case 'simulacion_usuarios':
      innerHtml = `
        <div style="padding: 12px; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; margin: 10px 0; font-family: Arial, sans-serif;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="border: none; padding: 4px; font-weight: bold; color: #475569; font-size: 9.5pt; width: 140px; font-family: Arial, sans-serif;">Simulando Usuario:</td>
              <td style="border: none; padding: 4px; font-family: Arial, sans-serif;">
                <div style="padding: 6px 12px; border: 1.5px solid #cbd5e1; border-radius: 6px; font-weight: bold; color: #1A2D7C; font-size: 10pt; background-color: #f8fafc; display: inline-block; font-family: Arial, sans-serif;">
                  Carlos Alberto (Admin — Sede Principal)
                </div>
              </td>
              <td style="border: none; padding: 4px; text-align: right; font-family: Arial, sans-serif;">
                <span style="background-color: #1A2D7C; color: #ffffff; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 8.5pt; text-transform: uppercase; font-family: Arial, sans-serif; display: inline-block;">Confirmar Cambio</span>
              </td>
            </tr>
          </table>
        </div>
      `;
      break;
    case 'interruptores':
      innerHtml = `
        <div style="padding: 12px; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; margin: 10px 0; font-family: Arial, sans-serif;">
          <p style="font-weight: bold; color: #1A2D7C; margin-top: 0; margin-bottom: 10px; font-size: 10pt; font-family: Arial, sans-serif; text-transform: uppercase;">CONFIGURACIÓN DE PANTALLAS DE REPORTES</p>
          <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
            <tr>
              <td style="padding: 6px; border: 1px solid #e2e8f0; background-color: #f8fafc; font-weight: bold; font-size: 9pt; width: 35%; font-family: Arial, sans-serif;">Suma Consolidada de Caja</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; background-color: #f8fafc; text-align: center; color: #15803d; font-weight: bold; font-size: 9pt; font-family: Arial, sans-serif;">[ ACTIVO / ON ]</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; background-color: #f8fafc; font-weight: bold; font-size: 9pt; width: 35%; font-family: Arial, sans-serif;">Eficacia Conciliaria</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; background-color: #f8fafc; text-align: center; color: #15803d; font-weight: bold; font-size: 9pt; font-family: Arial, sans-serif;">[ ACTIVO / ON ]</td>
            </tr>
            <tr>
              <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 9pt; font-family: Arial, sans-serif;">Participación por Sede</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; color: #b91c1c; font-weight: bold; font-size: 9pt; font-family: Arial, sans-serif;">[ OCULTO / OFF ]</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 9pt; font-family: Arial, sans-serif;">Rendimiento de Asesores</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; color: #15803d; font-weight: bold; font-size: 9pt; font-family: Arial, sans-serif;">[ ACTIVO / ON ]</td>
            </tr>
          </table>
        </div>
      `;
      break;
    case 'auditoria':
      innerHtml = `
        <div style="padding: 8px; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; margin: 10px 0; font-family: Arial, sans-serif;">
          <table style="width: 100%; border-collapse: collapse; font-size: 9pt; font-family: Arial, sans-serif;">
            <thead>
              <tr style="background-color: #f1f5f9; color: #475569;">
                <th style="padding: 6px; border-bottom: 2px solid #cbd5e1; font-weight: bold; text-align: left; background-color: #f1f5f9; color: #475569; font-size: 8.5pt; font-family: Arial, sans-serif;">Evento</th>
                <th style="padding: 6px; border-bottom: 2px solid #cbd5e1; font-weight: bold; text-align: left; background-color: #f1f5f9; color: #475569; font-size: 8.5pt; font-family: Arial, sans-serif;">Detalles de Acción</th>
                <th style="padding: 6px; border-bottom: 2px solid #cbd5e1; font-weight: bold; text-align: left; background-color: #f1f5f9; color: #475569; font-size: 8.5pt; font-family: Arial, sans-serif;">Usuario y Sede</th>
                <th style="padding: 6px; border-bottom: 2px solid #cbd5e1; font-weight: bold; text-align: right; background-color: #f1f5f9; color: #475569; font-size: 8.5pt; font-family: Arial, sans-serif;">Hora</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #15803d; font-size: 8pt; font-family: Arial, sans-serif;">[VALIDACIÓN]</td>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 8.5pt; font-family: Arial, sans-serif;">Concilió transacción #TX_6519_2026 por $543,000</td>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 8.5pt; font-weight: bold; font-family: Arial, sans-serif;">Lucía Pérez (Caja Guayabal)</td>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 8.5pt; text-align: right; font-family: monospace;">10:30:15 AM</td>
              </tr>
              <tr>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1d4ed8; font-size: 8pt; font-family: Arial, sans-serif;">[CARGA]</td>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 8.5pt; font-family: Arial, sans-serif;">Cargó extracto Sabaneta (14 registros)</td>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 8.5pt; font-weight: bold; font-family: Arial, sans-serif;">Marta Delgado (Tesorería)</td>
                <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 8.5pt; text-align: right; font-family: monospace;">08:15:30 AM</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      break;
    case 'limpieza_db':
      innerHtml = `
        <div style="padding: 15px; background-color: #fef2f2; border: 1.5px solid #fecaca; border-radius: 8px; margin: 10px 0; text-align: center; font-family: Arial, sans-serif;">
          <h4 style="color: #991b1b; font-size: 10.5pt; font-weight: bold; margin-top: 0; margin-bottom: 5px; font-family: Arial, sans-serif;">⚠️ PROTOCOLO DE REINICIO DE BASE DE DATOS</h4>
          <p style="color: #7f1d1d; font-size: 9pt; margin-bottom: 12px; text-align: center; font-family: Arial, sans-serif;">
            Esta acción borrará definitivamente la totalidad de transacciones de la plataforma. ¿Confirmar reinicio?
          </p>
          <span style="background-color: #b91c1c; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 8.5pt; margin-right: 10px; display: inline-block; font-family: Arial, sans-serif;">Confirmar Reinicio</span>
          <span style="background-color: #e2e8f0; color: #475569; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 8.5pt; display: inline-block; font-family: Arial, sans-serif;">Cancelar</span>
        </div>
      `;
      break;
    case 'cargar_banco':
      innerHtml = `
        <div style="padding: 15px; background-color: #ffffff; border: 2px dashed #475569; border-radius: 8px; margin: 10px 0; text-align: center; font-family: Arial, sans-serif;">
          <div style="font-size: 20pt; margin-bottom: 5px; color: #1A2D7C;">☁️</div>
          <h4 style="color: #334155; font-size: 10.5pt; font-weight: bold; margin-top: 0; margin-bottom: 4px; font-family: Arial, sans-serif;">extracto_bancolombia_2026.xlsx</h4>
          <p style="color: #64748b; font-size: 8.5pt; font-family: monospace; text-transform: uppercase; margin-bottom: 8px;">Excel Detectado • Listo para Mapeo de Columnas</p>
          <span style="background-color: #10b981; color: #ffffff; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 8pt; font-family: Arial, sans-serif; display: inline-block;">LECTURA COMPLETA 100%</span>
        </div>
      `;
      break;
    case 'sede_cuenta':
      innerHtml = `
        <div style="padding: 12px; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; margin: 10px 0; font-family: Arial, sans-serif;">
          <span style="font-weight: bold; color: #475569; font-size: 9.5pt; font-family: Arial, sans-serif;">Asignar Sede / Cuenta de Destino:</span>
          <span style="font-weight: bold; color: #1A2D7C; font-size: 10pt; background-color: #f8fafc; padding: 4px 8px; border: 1.5px solid #cbd5e1; border-radius: 6px; margin-left: 10px; font-family: Arial, sans-serif; display: inline-block;">
            Guayabal (Cuenta Ahorros ***6519)
          </span>
        </div>
      `;
      break;
    case 'mapeo_columnas':
      innerHtml = `
        <div style="padding: 12px; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; margin: 10px 0; font-family: Arial, sans-serif;">
          <p style="font-weight: bold; color: #1A2D7C; margin-top: 0; margin-bottom: 8px; font-size: 9.5pt; font-family: Arial, sans-serif; text-transform: uppercase;">ASOCIACIÓN DE COLUMNAS DE EXCEL</p>
          <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 9pt; font-family: Arial, sans-serif;">Fecha del Movimiento</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold; color: #1A2D7C; font-size: 9.5pt; font-family: monospace;">FECHA</td>
            </tr>
            <tr>
              <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 9pt; font-family: Arial, sans-serif;">ID Transacción / Referencia</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold; color: #1A2D7C; font-size: 9.5pt; font-family: monospace;">DOCUMENTO</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 9pt; font-family: Arial, sans-serif;">Monto / Valor del Abono</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold; color: #1A2D7C; font-size: 9.5pt; font-family: monospace;">VALOR</td>
            </tr>
            <tr>
              <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold; font-size: 9pt; font-family: Arial, sans-serif;">Descripción del Abono</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold; color: #1A2D7C; font-size: 9.5pt; font-family: monospace;">DETALLE</td>
            </tr>
          </table>
        </div>
      `;
      break;
    case 'resumen_carga':
      innerHtml = `
        <div style="padding: 12px; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; margin: 10px 0; max-width: 320px; font-family: Arial, sans-serif;">
          <h5 style="color: #1A2D7C; font-weight: bold; margin-top: 0; margin-bottom: 8px; font-size: 9.5pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; font-family: Arial, sans-serif; text-transform: uppercase;">RESUMEN DE IMPORTACIÓN</h5>
          <table style="width: 100%; border-collapse: collapse; font-size: 9pt; font-family: Arial, sans-serif;">
            <tr><td style="border:none; padding:3px; font-family: Arial, sans-serif;">Registros creados con éxito:</td><td style="border:none; padding:3px; text-align:right; font-weight:bold; color:#16803d; font-family: Arial, sans-serif;">12 Nuevos</td></tr>
            <tr><td style="border:none; padding:3px; font-family: Arial, sans-serif;">Registros omitidos (Duplicados):</td><td style="border:none; padding:3px; text-align:right; font-weight:bold; color:#b45309; font-family: Arial, sans-serif;">2 Omitidos</td></tr>
            <tr style="border-top:1px solid #e2e8f0;"><td style="border:none; padding:3px; font-weight:bold; font-family: Arial, sans-serif;">Suma total cargada:</td><td style="border:none; padding:3px; text-align:right; font-weight:bold; color:#111827; font-family: Arial, sans-serif;">$14,500,000 COP</td></tr>
          </table>
        </div>
      `;
      break;
    case 'validar_transacciones_caja':
      innerHtml = `
        <div style="padding: 12px; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; margin: 10px 0; font-family: Arial, sans-serif;">
          <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
            <tr>
              <td style="border: none; padding: 4px; vertical-align: top; font-family: Arial, sans-serif;">
                <span style="background-color: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 8pt; text-transform: uppercase; font-family: Arial, sans-serif; display: inline-block;">PENDIENTE EN BANCO</span>
                <p style="font-weight: bold; color: #1e293b; font-size: 10pt; margin-top: 6px; margin-bottom: 4px; font-family: Arial, sans-serif;">TRANSFERENCIA INSTANTANEA QR BANCOLOMBIA</p>
                <code style="font-size: 8.5pt; color: #64748b; font-family: monospace;">ID: TX_6519_2026_A3</code>
              </td>
              <td style="border: none; padding: 4px; text-align: right; vertical-align: middle; width: 150px; font-family: Arial, sans-serif;">
                <span style="font-weight: bold; font-size: 13pt; color: #111827; display: block; font-family: monospace;">$543,000</span>
                <span style="background-color: #1A2D7C; color: #ffffff; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 8pt; display: inline-block; margin-top: 6px; font-family: Arial, sans-serif; text-transform: uppercase;">Identificar Pago</span>
              </td>
            </tr>
          </table>
        </div>
      `;
      break;
    case 'buscador_abonos':
      innerHtml = `
        <div style="padding: 8px 12px; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; margin: 10px 0; font-size: 9.5pt; font-family: Arial, sans-serif;">
          🔍 <span style="font-weight: bold; color: #1e293b; margin-left: 5px; font-family: Arial, sans-serif;">Buscando abono:</span> 
          <span style="font-family: monospace; font-weight: bold; color: #1A2D7C; background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px;">543000</span>
        </div>
      `;
      break;
    case 'formulario_conciliacion':
      innerHtml = `
        <div style="padding: 12px; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; margin: 10px 0; max-width: 300px; font-family: Arial, sans-serif;">
          <h5 style="color: #1A2D7C; font-weight: bold; margin-top: 0; margin-bottom: 10px; font-size: 9.5pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; font-family: Arial, sans-serif; text-transform: uppercase;">FORMULARIO DE CONCILIACIÓN</h5>
          <div style="font-size: 9pt; margin-bottom: 8px; font-family: Arial, sans-serif;">
            <strong style="color: #475569; font-size: 8pt; display: block; text-transform: uppercase; font-family: Arial, sans-serif;">Nombre del Cliente:</strong>
            <div style="padding: 4px; border: 1px solid #e2e8f0; border-radius: 4px; background-color: #f8fafc; font-weight: bold; font-family: Arial, sans-serif;">Pedro Gómez</div>
          </div>
          <div style="font-size: 9pt; margin-bottom: 12px; font-family: Arial, sans-serif;">
            <strong style="color: #475569; font-size: 8pt; display: block; text-transform: uppercase; font-family: Arial, sans-serif;">Asesor Responsable:</strong>
            <div style="padding: 4px; border: 1px solid #e2e8f0; border-radius: 4px; background-color: #f8fafc; font-weight: bold; font-family: Arial, sans-serif;">Mateo Osorio (Socio Comercial)</div>
          </div>
          <span style="background-color: #F47920; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 8pt; text-align: center; display: block; font-family: Arial, sans-serif; text-transform: uppercase;">Guardar Validación</span>
        </div>
      `;
      break;
    case 'chat_google_meet':
      innerHtml = `
        <div style="padding: 10px; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; margin: 10px 0; text-align: center; font-family: Arial, sans-serif;">
          <span style="background-color: #F47920; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 8pt; margin-right: 10px; display: inline-block; font-family: Arial, sans-serif;">💬 Chat de Soporte</span>
          <span style="background-color: #4f46e5; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 8pt; display: inline-block; font-family: Arial, sans-serif;">📹 Videollamada Google Meet</span>
        </div>
      `;
      break;
    case 'indicadores_kpi':
      innerHtml = `
        <div style="margin: 10px 0; font-family: Arial, sans-serif;">
          <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1; background-color: #f8fafc; text-align: center; width: 50%; font-family: Arial, sans-serif;">
                <span style="font-size: 8pt; color: #64748b; font-weight: bold; text-transform: uppercase; display: block; font-family: Arial, sans-serif;">Suma Consolidada</span>
                <span style="font-size: 13pt; color: #1A2D7C; font-weight: bold; font-family: monospace; display: block; margin-top: 4px;">$15,400,000</span>
              </td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; background-color: #f8fafc; text-align: center; width: 50%; font-family: Arial, sans-serif;">
                <span style="font-size: 8pt; color: #64748b; font-weight: bold; text-transform: uppercase; display: block; font-family: Arial, sans-serif;">Eficacia Conciliaria</span>
                <span style="font-size: 13pt; color: #F47920; font-weight: bold; font-family: monospace; display: block; margin-top: 4px;">84.5%</span>
              </td>
            </tr>
          </table>
        </div>
      `;
      break;
    case 'graficos_sede':
      innerHtml = `
        <div style="padding: 12px; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; margin: 10px 0; font-family: Arial, sans-serif;">
          <p style="font-weight: bold; color: #1A2D7C; margin-top: 0; margin-bottom: 8px; font-size: 9.5pt; font-family: Arial, sans-serif; text-transform: uppercase;">PARTICIPACIÓN POR SEDE FÍSICA</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 9pt; font-family: Arial, sans-serif;">
            <tr>
              <td style="padding: 4px; border: none; font-weight: bold; width: 140px; font-family: Arial, sans-serif;">Guayabal (Cuenta ***6519):</td>
              <td style="padding: 4px; border: none; vertical-align: middle; font-family: Arial, sans-serif;">
                <div style="background-color: #f1f5f9; height: 12px; border-radius: 6px; overflow: hidden; width: 100%;">
                  <div style="background-color: #1A2D7C; height: 100%; width: 65%;"></div>
                </div>
              </td>
              <td style="padding: 4px; border: none; font-weight: bold; text-align: right; width: 80px; color: #1A2D7C; font-family: Arial, sans-serif;">$10.0M (65%)</td>
            </tr>
            <tr>
              <td style="padding: 4px; border: none; font-weight: bold; font-family: Arial, sans-serif;">Sabaneta (Cuenta ***0916):</td>
              <td style="padding: 4px; border: none; vertical-align: middle; font-family: Arial, sans-serif;">
                <div style="background-color: #f1f5f9; height: 12px; border-radius: 6px; overflow: hidden; width: 100%;">
                  <div style="background-color: #F47920; height: 100%; width: 25%;"></div>
                </div>
              </td>
              <td style="padding: 4px; border: none; font-weight: bold; text-align: right; color: #F47920; font-family: Arial, sans-serif;">$3.8M (25%)</td>
            </tr>
            <tr>
              <td style="padding: 4px; border: none; font-weight: bold; font-family: Arial, sans-serif;">Naranjal (Cuenta ***6807):</td>
              <td style="padding: 4px; border: none; vertical-align: middle; font-family: Arial, sans-serif;">
                <div style="background-color: #f1f5f9; height: 12px; border-radius: 6px; overflow: hidden; width: 100%;">
                  <div style="background-color: #6366f1; height: 100%; width: 10%;"></div>
                </div>
              </td>
              <td style="padding: 4px; border: none; font-weight: bold; text-align: right; color: #6366f1; font-family: Arial, sans-serif;">$1.6M (10%)</td>
            </tr>
          </table>
        </div>
      `;
      break;
    case 'rendimiento_asesores':
      innerHtml = `
        <div style="padding: 12px; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; margin: 10px 0; font-family: Arial, sans-serif;">
          <p style="font-weight: bold; color: #1A2D7C; margin-top: 0; margin-bottom: 8px; font-size: 9.5pt; font-family: Arial, sans-serif; text-transform: uppercase;">DESEMPEÑO Y COMISIONES DE ASESORES</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 9pt; font-family: Arial, sans-serif;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold; font-family: Arial, sans-serif;">1. Mateo Osorio</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #1A2D7C; font-family: monospace;">$8,400,000</td>
            </tr>
            <tr>
              <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold; font-family: Arial, sans-serif;">2. Pedro Gómez</td>
              <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #475569; font-family: monospace;">$5,200,000</td>
            </tr>
          </table>
        </div>
      `;
      break;
    default:
      innerHtml = `<div style="border: 2px dashed #94a3b8; background-color: #f8fafc; padding: 20px; text-align: center; color: #475569; font-style: italic; font-family: Arial, sans-serif;">[Espacio de Captura Digital: ${type}]</div>`;
  }

  return `
    <div class="digital-mockup" style="border: 1.5px solid #cbd5e1; background-color: #ffffff; padding: 12px; margin: 12pt 0; border-radius: 8px; font-family: Arial, sans-serif; text-align: left;">
      <div style="font-weight: bold; font-size: 8.5pt; color: #1A2D7C; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; font-family: Arial, sans-serif; letter-spacing: 0.5px;">${title}</div>
      <div>
        ${innerHtml}
      </div>
    </div>
  `;
}

function MockupImage({ type }: { type: string }) {
  return (
    <div className="my-5 border border-slate-200 rounded-xl overflow-hidden shadow-md bg-white max-w-2xl mx-auto text-left">
      {/* Top window bar */}
      <div className="bg-slate-50 px-3.5 py-2 flex items-center gap-1.5 border-b border-slate-150 select-none">
        <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
        <span className="text-[10px] text-slate-400 font-mono ml-2 font-bold uppercase tracking-wider">DEGRES Conciliador — Captura Digital</span>
      </div>
      
      {/* Content wrapper */}
      <div className="p-4 bg-slate-50/30">
        {type === 'simulacion_usuarios' && (
          <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Simulando Usuario:</span>
              <select className="text-xs font-bold border border-slate-350 rounded-lg px-2.5 py-1.5 bg-slate-50 text-[#1A2D7C] outline-none" defaultValue="admin" disabled>
                <option value="admin">Carlos Alberto (Admin — Sede Principal)</option>
              </select>
            </div>
            <button className="bg-[#1A2D7C] text-white text-[9px] font-black uppercase px-4 py-2 rounded-lg shadow border-b-2 border-indigo-950">
              Confirmar Cambio
            </button>
          </div>
        )}

        {type === 'interruptores' && (
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm space-y-3">
            <h5 className="text-[10px] font-black text-[#1A2D7C] uppercase tracking-wider mb-2">Configuración de Pantallas de Reportes</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { label: "Suma Consolidada de Caja", val: true },
                { label: "Eficacia Conciliaria", val: true },
                { label: "Participación por Sede", val: false },
                { label: "Rendimiento de Asesores", val: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 border border-slate-100 rounded-lg bg-slate-50/50">
                  <span className="font-bold text-slate-700 text-[10.5px]">{item.label}</span>
                  <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ${item.val ? 'bg-[#F47920]' : 'bg-slate-300'}`}>
                    <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-200 ${item.val ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {type === 'auditoria' && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-sm">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-250 font-extrabold text-slate-500 uppercase tracking-widest text-[9px]">
                  <th className="p-2.5">Evento / Acción</th>
                  <th className="p-2.5">Detalles</th>
                  <th className="p-2.5">Usuario</th>
                  <th className="p-2.5 text-right">Hora Exacta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 font-medium text-slate-650">
                <tr>
                  <td className="p-2.5"><span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[8.5px] uppercase">Validación</span></td>
                  <td className="p-2.5">Identificó transacción <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-950 font-mono">...6519_QR</code> por $543,000</td>
                  <td className="p-2.5 font-bold">Lucía Pérez (Caja Guayabal)</td>
                  <td className="p-2.5 text-right font-mono text-slate-400">10:30:15 AM</td>
                </tr>
                <tr>
                  <td className="p-2.5"><span className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[8.5px] uppercase">Carga Archivo</span></td>
                  <td className="p-2.5">Cargó excel con 14 registros para sede Sabaneta</td>
                  <td className="p-2.5 font-bold">Marta Delgado (Tesorería)</td>
                  <td className="p-2.5 text-right font-mono text-slate-400">08:15:30 AM</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {type === 'limpieza_db' && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg shadow-sm max-w-md mx-auto space-y-3 text-center">
            <div className="w-9 h-9 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto border border-rose-150">
              <span className="text-sm font-bold">⚠️</span>
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-rose-900 uppercase">¿Reiniciar Base de Datos Contable?</h4>
              <p className="text-[10px] text-rose-700 mt-1 leading-relaxed font-semibold">
                Esta acción borrará de manera definitiva y permanente la totalidad de los registros cargados en Firestore. Esta operación es irreversible.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-1.5">
              <button className="px-3.5 py-1.5 bg-rose-700 text-white rounded-lg text-[9px] font-black uppercase shadow cursor-not-allowed">Confirmar Reinicio</button>
              <button className="px-3.5 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-[9px] font-bold uppercase cursor-not-allowed">Cancelar</button>
            </div>
          </div>
        )}

        {type === 'cargar_banco' && (
          <div className="p-5 bg-white border-2 border-dashed border-slate-350 rounded-xl text-center shadow-sm space-y-3">
            <div className="w-11 h-11 bg-indigo-50 text-[#1A2D7C] rounded-full flex items-center justify-center mx-auto border border-indigo-100">
              <span className="text-lg">☁️</span>
            </div>
            <div>
              <h4 className="font-black text-[11px] text-slate-700 uppercase">extracto_bancolombia_2026.xlsx</h4>
              <p className="text-[8.5px] text-slate-400 uppercase font-black tracking-wider mt-1 font-mono">Excel Detectado • Listo para Mapeo de Columnas</p>
            </div>
            <div className="w-full max-w-xs bg-slate-100 rounded-full h-1.5 mx-auto overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
            </div>
            <span className="inline-block bg-emerald-150 text-emerald-800 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wide">Lectura Completa 100%</span>
          </div>
        )}

        {type === 'sede_cuenta' && (
          <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center gap-3 shadow-sm max-w-sm mx-auto">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Cuenta Destino:</span>
            <select className="flex-1 text-xs font-bold border border-slate-300 rounded-lg p-1.5 bg-slate-50 text-slate-700 outline-none" defaultValue="guayabal" disabled>
              <option value="guayabal">Guayabal - Ahorros (***6519)</option>
              <option value="sabaneta">Sabaneta - Ahorros (***0916)</option>
              <option value="naranjal">Naranjal - Ahorros (***6807)</option>
            </select>
          </div>
        )}

        {type === 'mapeo_columnas' && (
          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm space-y-2.5 max-w-md mx-auto text-xs">
            <h5 className="text-[10px] font-black text-[#1A2D7C] uppercase tracking-wider border-b border-slate-100 pb-1">Asociación de Columnas</h5>
            {[
              { req: "Fecha del Movimiento", col: "FECHA" },
              { req: "ID Transacción / Ref", col: "DOCUMENTO" },
              { req: "Valor / Monto", col: "VALOR" },
              { req: "Descripción / Concepto", col: "DETALLE" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-1 border-b border-slate-50 last:border-none">
                <span className="font-extrabold text-slate-600 text-[10px]">{item.req}:</span>
                <select className="text-[10.5px] font-bold border border-slate-300 rounded px-2 py-1 bg-slate-50 text-slate-800 min-w-[120px]" defaultValue={item.col} disabled>
                  <option value={item.col}>{item.col}</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {type === 'resumen_carga' && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm max-w-sm mx-auto space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <h4 className="font-black text-[11px] text-[#1A2D7C] uppercase tracking-wider">Resumen de Importación</h4>
            </div>
            <div className="space-y-1.5 text-xs font-semibold">
              <div className="flex justify-between text-slate-650"><span>Registros creados con éxito:</span> <strong className="text-emerald-650 font-black">12 Nuevos</strong></div>
              <div className="flex justify-between text-slate-650"><span>Registros omitidos (Duplicados):</span> <strong className="text-amber-600 font-black">2 Omitidos</strong></div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 text-slate-800"><span className="font-bold">Suma total importada:</span> <strong className="text-slate-900 font-extrabold">$14,500,000 COP</strong></div>
            </div>
          </div>
        )}

        {type === 'validar_transacciones_caja' && (
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm text-[10.5px]">
            <div className="bg-slate-50 p-2.5 font-black text-slate-500 uppercase border-b border-slate-200 flex justify-between tracking-wide text-[9px]">
              <span>Sede: Guayabal (***6519)</span>
              <span className="text-[#F47920]">Transacciones Pendientes (01)</span>
            </div>
            <div className="p-3.5 flex items-center justify-between gap-4 bg-amber-50/10">
              <div className="space-y-1">
                <span className="bg-amber-100 text-amber-800 text-[8.5px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase">PENDIENTE EN BANCO</span>
                <p className="font-extrabold text-slate-800 text-[11px] leading-snug">TRANSFERENCIA INSTANTANEA QR BANCOLOMBIA</p>
                <span className="text-[9.5px] text-slate-400 font-mono block">ID: TX_6519_2026_A3</span>
              </div>
              <div className="text-right space-y-2 shrink-0">
                <span className="font-black text-slate-900 text-base block font-mono">$543,000</span>
                <button className="bg-[#1A2D7C] text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg shadow-sm cursor-not-allowed">Marcar Identificada</button>
              </div>
            </div>
          </div>
        )}

        {type === 'buscador_abonos' && (
          <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center gap-2 shadow-sm max-w-sm mx-auto">
            <span className="text-[12px] text-slate-400">🔍</span>
            <input type="text" className="flex-1 text-xs font-bold border-none outline-none text-slate-800 bg-transparent" value="543000" readOnly />
            <span className="text-[9px] font-black bg-[#1A2D7C] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">Filtrado</span>
          </div>
        )}

        {type === 'formulario_conciliacion' && (
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-md max-w-xs mx-auto space-y-3.5 text-xs text-left">
            <h5 className="font-black text-[#1A2D7C] border-b border-slate-150 pb-1.5 uppercase text-[10.5px]">Formulario de Conciliación</h5>
            <div className="space-y-2.5">
              <div>
                <label className="block text-[9px] font-extrabold text-slate-500 uppercase mb-0.5">Nombre del Cliente *</label>
                <input type="text" className="w-full border border-slate-300 rounded p-1.5 font-bold text-slate-800 bg-slate-50" value="Pedro Gómez" readOnly />
              </div>
              <div>
                <label className="block text-[9px] font-extrabold text-slate-500 uppercase mb-0.5">Asesor Responsable *</label>
                <select className="w-full border border-slate-300 rounded p-1.5 font-bold text-slate-850 bg-white" defaultValue="mateo" disabled>
                  <option value="mateo">Mateo Osorio (Socio Comercial)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1 border-t border-slate-150">
              <button className="flex-1 py-1.5 text-[9px] bg-[#F47920] text-white font-black rounded-lg uppercase shadow-sm cursor-not-allowed">Guardar Validación</button>
            </div>
          </div>
        )}

        {type === 'chat_google_meet' && (
          <div className="flex gap-4 justify-center py-2.5">
            <div className="w-11 h-11 bg-[#F47920] text-white rounded-full flex items-center justify-center shadow-lg cursor-not-allowed" title="Soporte Chat">
              <span className="text-lg">💬</span>
            </div>
            <div className="w-11 h-11 bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg cursor-not-allowed" title="Videollamada Directa">
              <span className="text-lg">📹</span>
            </div>
          </div>
        )}

        {type === 'indicadores_kpi' && (
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm text-center">
              <p className="text-[8px] uppercase text-slate-400 font-black tracking-widest">Suma Consolidada</p>
              <p className="text-[13px] font-black text-[#1A2D7C] mt-1 font-mono">$15,400,000</p>
            </div>
            <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm text-center">
              <p className="text-[8px] uppercase text-slate-400 font-black tracking-widest">Eficacia Conciliaria</p>
              <p className="text-[13px] font-black text-[#F47920] mt-1 font-mono">84.5%</p>
            </div>
          </div>
        )}

        {type === 'graficos_sede' && (
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm space-y-2.5 max-w-xs mx-auto text-[10px]">
            <h5 className="font-extrabold text-[#1A2D7C] uppercase tracking-wider border-b border-slate-100 pb-1 mb-1">Participación por Sede</h5>
            {[
              { name: "Guayabal (6519)", pct: 65, color: "bg-[#1A2D7C]", val: "$10.0M" },
              { name: "Sabaneta (0916)", pct: 25, color: "bg-[#F47920]", val: "$3.8M" },
              { name: "Naranjal (6807)", pct: 10, color: "bg-indigo-400", val: "$1.6M" },
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between font-bold text-slate-650">
                  <span>{item.name}</span>
                  <span>{item.val} ({item.pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`${item.color} h-1.5 rounded-full`} style={{ width: `${item.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {type === 'rendimiento_asesores' && (
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm text-[10.5px] max-w-xs mx-auto">
            <h5 className="font-black text-[#1A2D7C] uppercase tracking-wider border-b border-slate-100 pb-1.5 mb-2.5">Desempeño de Asesores</h5>
            <div className="space-y-2 font-semibold text-slate-600">
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="font-bold">1. Mateo Osorio</span>
                <strong className="text-[#1A2D7C] font-mono font-black">$8,400,000</strong>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg border border-slate-50">
                <span className="font-bold">2. Pedro Gómez</span>
                <strong className="text-slate-700 font-mono font-black">$5,200,000</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ManualesProps {
  currentUser: User;
}

export default function Manuales({ currentUser }: ManualesProps) {
  // Determine initial manual based on user role
  const getInitialManual = () => {
    const role = currentUser.role;
    if (role === 'Admin') return 'admin';
    if (role === 'Tesorera') return 'tesorera';
    if (role === 'Cajera') return 'cajera';
    return 'asesor';
  };

  const [activeManual, setActiveManual] = useState<'admin' | 'tesorera' | 'cajera' | 'asesor'>(getInitialManual);

  // Common corporate introduction to include in Word documents
  const getCommonIntroHtml = () => `
    <div style="background-color: #f8fafc; border-left: 6px solid #F47920; padding: 16px; margin-bottom: 20px; border-radius: 4px; font-family: Arial, sans-serif;">
      <h2 style="margin-top: 0; color: #1A2D7C; font-size: 13pt; font-weight: bold; border-bottom: 2px solid #F47920; padding-bottom: 4px; font-family: Arial, sans-serif;">1. INTRODUCCIÓN INSTITUCIONAL: DEGRES S.A.S.</h2>
      <p style="text-align: justify; font-size: 10.5pt; line-height: 1.5; color: #334155; font-family: Arial, sans-serif;">
        <strong>DEGRES S.A.S.</strong> es una organización líder en la comercialización y distribución de acabados arquitectónicos premium, cerámicas, porcelanatos, grifería y revestimientos de alta especificación. Con el fin de sostener la excelencia operativa y la transparencia en sus puntos de venta principales del Valle de Aburrá (las sedes físicas de <strong>Guayabal</strong>, <strong>Sabaneta</strong> y <strong>Naranjal</strong>), la compañía ha adoptado herramientas de automatización de vanguardia para sus procesos contables.
      </p>
      <p style="text-align: justify; font-size: 10.5pt; line-height: 1.5; color: #334155; font-family: Arial, sans-serif;">
        La <strong>Plataforma Conciliaria DEGRES</strong> es una solución de software web diseñada exclusivamente para optimizar, centralizar y conciliar en tiempo real los abonos y pagos que los clientes efectúan a través de transferencias bancarias directas y códigos QR corporativos de Bancolombia. Este aplicativo elimina el riesgo de fraudes, evita dobles registros, previene la entrega de mercancías sin soporte bancario verificado, y calcula de manera exacta las comisiones para nuestros Asesores Comerciales.
      </p>
      
      <!-- POLÍTICAS DE ACCESO, SEGURIDAD Y REVERSIÓN -->
      <div style="background-color: #fef2f2; border: 1.5px solid #fecaca; padding: 14px; margin-top: 15px; margin-bottom: 15px; border-radius: 6px; font-family: Arial, sans-serif;">
        <h3 style="margin-top: 0; color: #991b1b; font-size: 11pt; font-weight: bold; text-transform: uppercase; font-family: Arial, sans-serif; border-bottom: 1px solid #fecaca; padding-bottom: 4px;">POLÍTICAS DE SEGURIDAD Y ACCESO IMPERATIVAS</h3>
        <ul style="margin-bottom: 0; color: #7f1d1d; font-size: 9.5pt; padding-left: 20px; font-family: Arial, sans-serif; line-height: 1.45;">
          <li style="margin-bottom: 6px;"><strong>Inicio de Sesión Restringido:</strong> Por estrictas políticas de seguridad informática y auditoría contable de DEGRES S.A.S., el acceso a la plataforma está restringido única y exclusivamente a correos electrónicos institucionales con el dominio oficial <strong>@degrescolombia.com</strong>. No se permite el registro ni inicio de sesión con cuentas de dominios públicos (Gmail, Hotmail, Yahoo, etc.).</li>
          <li style="margin-bottom: 6px;"><strong>Procedimiento de Reversión y Re-habilitación (Cajeras):</strong> Queda terminantemente prohibido intentar modificar o re-habilitar manualmente un abono que ya ha sido identificado y validado. Si una cajera comete un error (como asignar un asesor comercial equivocado o ingresar erróneamente los datos del cliente), deberá reportarlo de inmediato al <strong>Administrador</strong> a través del <strong>Chat de Soporte Técnico</strong> o mediante <strong>Videollamada de Google Meet</strong>. Únicamente el Administrador posee la clave de control maestro y privilegios especiales para "Revertir Conciliaciones" y reactivar la transacción a estado "Pendiente".</li>
          <li style="margin-bottom: 6px;"><strong>Canales de Soporte en Tiempo Real:</strong> En la esquina inferior derecha de la plataforma, todos los usuarios tienen acceso a los botones de soporte unificado:
            <ul style="padding-left: 15px; margin-top: 4px; font-family: Arial, sans-serif;">
              <li>• <strong>Chat de Soporte Técnico:</strong> Comunicación de texto en tiempo real con el Administrador y el equipo de Tesorería.</li>
              <li>• <strong>Videollamada de Google Meet:</strong> Permite iniciar o unirse a una llamada de audio/video y compartir pantalla para resolver inconsistencias contables de forma inmediata.</li>
            </ul>
          </li>
          <li style="margin-bottom: 0;"><strong>Foro y Tablón de Información General:</strong> La plataforma incorpora un <strong>Foro de Comunicados</strong> en el panel de inicio. Es responsabilidad obligatoria de todo el personal (Cajeras, Tesoreras, Asesores) revisar esta sección al inicio de cada jornada para estar al tanto de las directrices contables semanales, suspensiones temporales de cuentas, novedades en la cartera bancaria y alertas del área administrativa.</li>
        </ul>
      </div>

      <p style="text-align: justify; font-size: 10.5pt; line-height: 1.5; color: #334155; font-style: italic; font-family: Arial, sans-serif;">
        Este manual de usuario es un documento operativo obligatorio. Su lectura y aplicación rigurosa garantizan la consistencia contable del negocio y la agilidad en la atención de nuestros distinguidos clientes.
      </p>
    </div>
  `;

  // Standard styled page break for Word documents
  const getPageBreakHtml = () => `
    <br style="page-break-before: always; clear: both;" />
  `;

  // HTML content of the Administrator manual
  const getAdminManualHtml = () => `
    <h1 style="color: #1A2D7C; font-size: 18pt; font-weight: bold; margin-bottom: 12px; border-bottom: 3px solid #1A2D7C; padding-bottom: 6px;">
      MANUAL DE USUARIO: ROL ADMINISTRADOR (CONTROL TOTAL)
    </h1>
    
    ${getCommonIntroHtml()}

    <h2 style="color: #1A2D7C; font-size: 13pt; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">2. PERFIL ADMINISTRATIVO: ATRIBUCIONES Y ALCANCE</h2>
    <p style="text-align: justify;">
      El perfil de <strong>Administrador</strong> dentro de la Plataforma Conciliaria tiene acceso irrestricto de lectura y escritura sobre todos los módulos del sistema. Su misión fundamental es auditar la correspondencia entre los abonos conciliados, corregir inconsistencias del personal en caja y preparar el sistema para nuevos periodos de facturación mensual mediante herramientas avanzadas de limpieza y reversión de datos.
    </p>

    <h2 style="color: #1A2D7C; font-size: 13pt; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">3. PASO A PASO: CONFIGURACIONES Y OPERACIONES CRÍTICAS</h2>

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.1: Uso de la Herramienta de Simulación de Perfiles</h3>
    <p style="text-align: justify;">
      Para auditar de manera presencial lo que visualiza cada rol operativo (Cajeras, Tesoreras y Asesores) en sus respectivas pantallas de trabajo, la plataforma incorpora un <strong>Simulador Dinámico de Usuarios</strong> en el encabezado superior del panel de control.
    </p>
    <ol style="margin-bottom: 16px;">
      <li>Diríjase a la parte superior izquierda de la pantalla en la sección <strong>"Panel de Control"</strong>.</li>
      <li>Ubique el selector desplegable titulado <strong>"Simulando Usuario:"</strong>.</li>
      <li>Haga clic y seleccione uno de los perfiles disponibles de la lista predeterminada:
        <ul>
          <li><strong>Carlos Alberto</strong> (Admin - Control Maestro)</li>
          <li><strong>Paula Restrepo</strong> (Tesorera - Cargue de Extractos)</li>
          <li><strong>Erika Cadavid</strong> (Cajera Guayabal - Validación)</li>
          <li><strong>Andrés Montoya</strong> (Asesor Comercial - Reportes de Ventas)</li>
        </ul>
      </li>
      <li>Al seleccionar un usuario, presione el botón azul de confirmación. El sistema actualizará de manera instantánea el menú, las restricciones de vista y los datos locales de sede asignada de acuerdo con el perfil seleccionado.</li>
    </ol>
    ${getExportMockupHtml('simulacion_usuarios')}

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.2: Configuración del Dashboard de Reportes (Visibilidad Controlada)</h3>
    <p style="text-align: justify;">
      El administrador tiene la facultad de activar o desactivar en tiempo real los análisis que se visualizan en el módulo de <strong>"Reportes y Cifras"</strong> para el resto del personal. Esto es clave para mantener la privacidad de cifras agregadas o evitar que la sobrecarga de información distraiga a las cajeras durante la atención.
    </p>
    <p style="text-align: justify;">
      Para modificar estos parámetros, ubique la tarjeta <strong>"Configuración de Pantallas de Reportes"</strong> y use los botones de conmutación (switches de encendido/apagado):
    </p>
    <ul>
      <li><strong>Botón "Suma Consolidada":</strong> Si está activo, permite que el personal visualice la suma global de todas las transferencias verificadas en COP de todas las cuentas de la empresa. Desactívelo para restringir el acceso a la facturación total.</li>
      <li><strong>Botón "Eficacia Conciliaria":</strong> Muestra u oculta la tasa porcentual de transacciones identificadas frente a las pendientes.</li>
      <li><strong>Botón "Participación por Sede Física":</strong> Permite ocultar las métricas de distribución de recaudo para Guayabal, Sabaneta o Naranjal.</li>
      <li><strong>Botón "Rendimiento de Asesores":</strong> Permite ocultar el escalafón de recaudo por asesor en otras pantallas. Ideal para mantener la confidencialidad de metas comerciales individuales en las cajas.</li>
      <li><strong>Botón "Filtros de Consulta General (Cajera)":</strong> Si se desactiva, la Cajera solo podrá buscar por referencia o monto puntual en el buscador básico, agilizando el flujo diario de caja y evitando que manipulen rangos de fechas históricos que ya han sido cerrados.</li>
    </ul>
    ${getExportMockupHtml('interruptores')}

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.3: Auditoría en Tiempo Real de Operaciones (Logs)</h3>
    <p style="text-align: justify;">
      El Administrador cuenta con una bitácora detallada inalterable titulada <strong>"Auditoría en Tiempo Real de la Plataforma"</strong>. Esta sección registra cada acción operativa ejecutada por el personal, permitiendo rastrear el origen de cualquier modificación en los datos.
    </p>
    <p style="text-align: justify;">
      Para auditar, lea la tabla de izquierda a derecha analizando las siguientes columnas:
    </p>
    <ul>
      <li><strong>Columna "Evento / Acción":</strong> Identifica el tipo de operación (Ej: "Carga de Extracto", "Validación en Caja", "Reversión Contable").</li>
      <li><strong>Columna "Detalles":</strong> Describe la información relevante de la operación, tales como el ID de la transacción afectada, el monto verificado en COP, el nombre del cliente y el asesor comercial que fue asignado.</li>
      <li><strong>Columna "Usuario y Sede":</strong> Muestra el nombre de la persona que realizó la acción y la sede física en la que se encontraba autenticado en ese instante del tiempo.</li>
      <li><strong>Columna "Hora Exacta":</strong> Marca de tiempo en formato de 12 horas con segundos del huso horario de Colombia (Bogotá), ideal para cotejar contra reclamaciones de clientes.</li>
    </ul>
    ${getExportMockupHtml('auditoria')}

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.4: Reversiones de Datos y Limpieza Contable</h3>
    <p style="text-align: justify;">
      En la base del panel se encuentran las herramientas de control maestro que afectan directamente la integridad de los registros. Su uso debe ser coordinado previamente con el área contable principal:
    </p>
    <ol>
      <li><strong>Botón "Revertir Conciliaciones a Pendiente":</strong>
        <p style="text-align: justify; margin-top: 4px; margin-bottom: 8px;">
          Su función es desvincular todas las validaciones que han efectuado las cajeras durante el periodo actual. Al presionarlo, el sistema solicitará una primera confirmación. Al validar, todas las transacciones identificadas volverán automáticamente a estado "Pendiente", borrando la asignación de nombre del cliente, cédula y comisión de asesores. <em>Se utiliza en casos de errores masivos en el cargue de extractos bancarios.</em>
        </p>
      </li>
      <li><strong>Botón "Reiniciar Base de Datos (Limpiar todo)":</strong>
        <p style="text-align: justify; margin-top: 4px; margin-bottom: 8px;">
          Esta función borra de forma definitiva y permanente la totalidad de los registros cargados en la base de datos de Google Firebase (tanto pendientes como identificados), dejando el sistema en cero absoluto. Al hacer clic en este botón, se activará un protocolo de seguridad que le exigirá presionar un segundo botón de confirmación roja. <em>Esta acción es irreversible y se ejecuta exclusivamente durante el cierre de mes contable, habiendo exportado con anterioridad todos los reportes de comisiones de asesores.</em>
        </p>
      </li>
    </ol>
    ${getExportMockupHtml('limpieza_db')}
  `;

  // HTML content of the Tesorera manual
  const getTesoreraManualHtml = () => `
    <h1 style="color: #1A2D7C; font-size: 18pt; font-weight: bold; margin-bottom: 12px; border-bottom: 3px solid #1A2D7C; padding-bottom: 6px;">
      MANUAL DE USUARIO: ROL TESORERA (CARGUE DE EXTRACTOS)
    </h1>
    
    ${getCommonIntroHtml()}

    <h2 style="color: #1A2D7C; font-size: 13pt; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">2. RESPONSABILIDAD OPERATIVA EN TESORERÍA</h2>
    <p style="text-align: justify;">
      La <strong>Tesorera</strong> es la única encargada de alimentar la plataforma con los movimientos bancarios reales de las cuentas corrientes y de ahorros corporativas de la empresa. Su labor es crítica: si los extractos no se cargan oportunamente en las primeras horas del día, las cajeras no podrán validar los abonos de los clientes, lo que generará demoras en el despacho de mercancías en las tiendas físicas.
    </p>

    <h2 style="color: #1A2D7C; font-size: 13pt; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">3. PROCEDIMIENTO OPERATIVO PASO A PASO: "CARGAR BANCO"</h2>

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.1: Descarga del Archivo de Movimientos de Bancolombia</h3>
    <p style="text-align: justify;">
      Ingrese a la plataforma de la sucursal virtual empresas de Bancolombia (o la entidad correspondiente). Descargue los movimientos del día anterior o de la jornada en curso. Exporte este archivo en formato de hoja de cálculo compatible (<strong>Excel .xlsx o .xls</strong>, o formato plano <strong>.csv</strong>). Guarde el archivo en una carpeta segura de su equipo de cómputo.
    </p>
    ${getExportMockupHtml('sucursal_virtual')}

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.2: Acceso a la Interfaz y Carga del Archivo</h3>
    <p style="text-align: justify;">
      Diríjase al menú izquierdo de la Plataforma Conciliaria DEGRES y haga clic en la pestaña <strong>"Cargar Banco"</strong>. En la pantalla aparecerá un panel de color blanco con una nube centralizada que actúa como zona interactiva de arrastre de archivos.
    </p>
    <ol style="margin-bottom: 16px;">
      <li>Haga clic directo en la zona de la nube para abrir el explorador de archivos de su sistema operativo y seleccione el archivo de Excel descargado en el Paso 3.1.</li>
      <li>De forma alternativa, puede arrastrar el archivo directamente desde el explorador de archivos de Windows o macOS y soltarlo dentro de la zona delimitada de la nube.</li>
      <li>Una vez cargado correctamente, el sistema leerá la estructura interna del archivo y desplegará automáticamente la interfaz de mapeo de columnas.</li>
    </ol>
    ${getExportMockupHtml('zona_arrastre')}

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.3: Selección de Sede Contable / Cuenta Bancaria</h3>
    <p style="text-align: justify;">
      Antes de mapear o procesar, debe informarle a la plataforma a cuál de las cuentas de recaudo oficiales de DEGRES S.A.S. corresponde el extracto bancario cargado. Esto es vital para que el sistema asocie los abonos a la sede física correcta de forma automática.
    </p>
    <p style="text-align: justify;">
      Ubique el selector desplegable <strong>"Asignar Sede / Cuenta de Destino"</strong> y elija una de las siguientes opciones según corresponda:
    </p>
    <ul>
      <li><strong>Guayabal (Cuenta Ahorros ***6519):</strong> Extractos pertenecientes a los recaudos de la sede Guayabal.</li>
      <li><strong>Sabaneta (Cuenta Ahorros ***0916):</strong> Extractos pertenecientes a los recaudos de la sede Sabaneta.</li>
      <li><strong>Naranjal (Cuenta Ahorros ***6807):</strong> Extractos pertenecientes a los recaudos de la sede Naranjal.</li>
    </ul>
    ${getExportMockupHtml('selector_sede')}

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.4: Mapeo Inteligente de Columnas de Entrada</h3>
    <p style="text-align: justify;">
      Dado que los formatos de reporte de los bancos varían, la plataforma cuenta con una interfaz que mapea las columnas del archivo de Excel con los cuatro campos requeridos por la base de datos de Google Firebase. 
    </p>
    <p style="text-align: justify;">
      Verifique la tabla que se despliega en pantalla y asocie las columnas requeridas utilizando los selectores:
    </p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px;">
      <thead>
        <tr style="background-color: #1A2D7C; color: white;">
          <th style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; text-align: left; font-size: 10pt;">Campo Requerido en Base de Datos</th>
          <th style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; text-align: left; font-size: 10pt;">Función Contable en la Plataforma</th>
          <th style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; text-align: left; font-size: 10pt;">Ejemplos Comunes de Encabezado en Excel</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt;"><strong>Fecha del Movimiento</strong></td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt;">Registra el día exacto en que ingresó el dinero a la cuenta bancaria.</td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt; font-family: monospace; color: #1e293b;">"FECHA", "DÍA DE OPERACIÓN", "FECHA_MOV"</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt;"><strong>ID de Transacción / Referencia</strong></td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt;">Documento identificador único del abono, que evita colisión y duplicidad de registros.</td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt; font-family: monospace; color: #1e293b;">"DOCUMENTO", "REFERENCIA", "CONSECUTIVO"</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt;"><strong>Monto / Valor del Abono</strong></td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt;">El valor monetario bruto ingresado a la cuenta bancaria en pesos colombianos.</td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt; font-family: monospace; color: #1e293b;">"VALOR", "CRÉDITO", "MONTO_COP", "INGRESOS"</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt;"><strong>Descripción del Abono</strong></td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt;">Información contextual (Ej: Transferencia Sucursal Virtual, Corresponsal Bancario).</td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt; font-family: monospace; color: #1e293b;">"DESCRIPCIÓN", "DETALLE", "CONCEPTO", "CANAL"</td>
        </tr>
      </tbody>
    </table>
    ${getExportMockupHtml('mapeo_columnas')}

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.5: Botón "Procesar y Guardar" y Validación del Resumen de Importación</h3>
    <p style="text-align: justify;">
      Una vez mapeadas las cuatro columnas críticas, haga clic en el botón naranja <strong>"Procesar y Guardar"</strong> ubicado en el extremo inferior del formulario de cargue. El sistema validará los registros en tiempo real en la base de datos de Google Firebase y desplegará un resumen contable inmediato:
    </p>
    <ul>
      <li><strong>Registros creados con éxito:</strong> Indica cuántas transacciones nuevas e inauditas ingresaron al sistema listas para conciliación.</li>
      <li><strong>Registros omitidos (Duplicados):</strong> Transacciones cuyo ID/Referencia ya existía en la base de datos de DEGRES, descartadas automáticamente para resguardar la exactitud contable.</li>
      <li><strong>Suma total cargada:</strong> Monto acumulado en COP cargado en este lote.</li>
    </ul>
    ${getExportMockupHtml('resultados_carga')}
  `;

  // HTML content of the Cajera manual
  const getCajeraManualHtml = () => `
    <h1 style="color: #1A2D7C; font-size: 18pt; font-weight: bold; margin-bottom: 12px; border-bottom: 3px solid #1A2D7C; padding-bottom: 6px;">
      MANUAL DE USUARIO: ROL CAJERA (VALIDACIÓN DE ABONOS)
    </h1>
    
    ${getCommonIntroHtml()}

    <h2 style="color: #1A2D7C; font-size: 13pt; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">2. RESPONSABILIDAD CRÍTICA EN PUNTOS DE VENTA</h2>
    <p style="text-align: justify;">
      La <strong>Cajera</strong> es el filtro final de control interno en las salas de exhibición de DEGRES S.A.S. Su labor garantiza que ningún despacho de acabados cerámicos, grifería o porcelanatos sea autorizado sin que el dinero del cliente haya sido efectivamente ingresado y auditado en la cuenta bancaria de la empresa.
    </p>
    <p style="text-align: justify; font-weight: bold; color: #dc2626; background-color: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 4px;">
      POLÍTICA INALTERABLE: Bajo ninguna circunstancia se facturará o despachará material cerámico apoyándose únicamente en "pantallazos" impresos o comprobantes digitales que muestre el cliente en su dispositivo móvil. El abono debe ser obligatoriamente conciliado y marcado como "IDENTIFICADA" en la plataforma.
    </p>

    <h2 style="color: #1A2D7C; font-size: 13pt; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">3. PASO A PASO: PROCESO COMPLETO DE CONCILIACIÓN EN CAJA</h2>

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.1: Acceso al Listado de Validación de Sede</h3>
    <p style="text-align: justify;">
      Haga clic en la pestaña <strong>"Validar Transacciones"</strong> en el menú lateral izquierdo. Por diseño del sistema, la interfaz filtrará la base de datos de manera automática mostrando por defecto únicamente los abonos entrantes de la sede física en la que usted está laborando (Guayabal, Sabaneta o Naranjal), optimizando la velocidad de respuesta.
    </p>
    ${getExportMockupHtml('tabla_validar')}

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.2: Filtrado Rápido e Identificación Visual del Abono</h3>
    <p style="text-align: justify;">
      Cuando el cliente realice la transferencia o el pago por QR, pídale el número de documento de transferencia (o referencia de la transacción) y el monto total en pesos.
    </p>
    <ol style="margin-bottom: 16px;">
      <li>Ubique el campo <strong>"Buscador de Abonos..."</strong> en la parte superior derecha de la tabla.</li>
      <li>Digite los últimos dígitos del número de referencia de la transferencia o digite el monto exacto (Ej: "450000"). El sistema filtrará en tiempo real.</li>
      <li>De manera opcional, use el selector de <strong>"Filtrar por Cuenta Bancaria"</strong> para discriminar entre las cuentas activas y acelerar el proceso.</li>
    </ol>
    ${getExportMockupHtml('filtros_caja')}

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.3: Diligenciamiento del Formulario de Conciliación</h3>
    <p style="text-align: justify;">
      Una vez localizada la fila que contiene el abono exacto:
    </p>
    <ol style="margin-bottom: 16px;">
      <li>Haga clic en el botón naranja <strong>"Identificar Pago"</strong> ubicado en el extremo derecho de la fila de la transacción.</li>
      <li>Se desplegará una ventana emergente de alta seguridad de Google Firestore.</li>
      <li>Complete obligatoriamente los siguientes campos del formulario:
        <ul>
          <li><strong>Nombre del Cliente:</strong> Digite el nombre completo del comprador o la razón social de la empresa.</li>
          <li><strong>Cédula de Ciudadanía o NIT:</strong> Ingrese el número de identificación del cliente sin puntos ni guiones (Ej: "1020456789").</li>
          <li><strong>Asesor Comercial:</strong> Seleccione de la lista desplegable el nombre exacto del asesor de ventas que atendió el negocio para asegurar la correcta asignación de comisiones.</li>
          <li><strong>Número de Factura / Pedido:</strong> Campo opcional para ligar la transacción con el consecutivo de facturación de DEGRES S.A.S.</li>
        </ul>
      </li>
    </ol>
    ${getExportMockupHtml('form_identificar')}

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.4: Guardado de Validación y Cambio de Estado</h3>
    <p style="text-align: justify;">
      Haga clic en el botón naranja <strong>"Guardar Validación"</strong> del formulario emergente:
    </p>
    <ul>
      <li>La transacción cambiará de forma inmediata su estado de "PENDIENTE" (azul) a <strong>"IDENTIFICADA"</strong>, y se mostrará resaltada en color verde oliva.</li>
      <li>En la fila se reflejará el nombre del cliente, su identificación y las iniciales del asesor asignado.</li>
      <li>La mercancía queda autorizada para despacho inmediato.</li>
    </ul>
    ${getExportMockupHtml('transaccion_identificada')}

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.5: Uso de la Asistencia de Caja (Chat y Google Meet Integrado)</h3>
    <p style="text-align: justify;">
      En caso de que el cliente demuestre haber realizado la transferencia pero la transacción no aparezca en pantalla, o si requiere soporte operativo de Tesorería, utilice las herramientas integradas en la esquina inferior derecha:
    </p>
    <ol style="margin-bottom: 16px;">
      <li><strong>Canal de Chat Directo (Soporte):</strong> Haga clic en el botón flotante naranja de chat. Digite su duda en el recuadro y presione enviar para establecer comunicación directa con el personal de Tesorería.</li>
      <li><strong>Enlace Directo de Google Meet:</strong> Si necesita asistencia guiada o compartir su pantalla con Tesorería, haga clic en el botón flotante con el icono de cámara (Google Meet). La plataforma generará de forma automática y unificada una videollamada instantánea. Comparta el enlace con su contraparte para conectarse.</li>
    </ol>
    ${getExportMockupHtml('chat_google_meet')}
  `;

  // HTML content of the Asesor Comercial manual
  const getAsesorManualHtml = () => `
    <h1 style="color: #1A2D7C; font-size: 18pt; font-weight: bold; margin-bottom: 12px; border-bottom: 3px solid #1A2D7C; padding-bottom: 6px;">
      MANUAL DE USUARIO: ROL ASESOR COMERCIAL (REPORTES DE VENTAS)
    </h1>
    
    ${getCommonIntroHtml()}

    <h2 style="color: #1A2D7C; font-size: 13pt; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">2. ROL DEL ASESOR COMERCIAL EN LA PLATAFORMA</h2>
    <p style="text-align: justify;">
      El perfil de <strong>Asesor Comercial</strong> tiene un rol consultivo de suma relevancia en la plataforma. Su acceso le permite revisar, auditar y presentar sus indicadores de ventas y comisiones acumuladas basándose en los abonos que las cajeras han validado a su nombre en las sedes de Guayabal, Sabaneta y Naranjal.
    </p>

    <h2 style="color: #1A2D7C; font-size: 13pt; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">3. PASO A PASO: SEGUIMIENTO DE METAS Y CIFRAS DE RECAUDO</h2>

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.1: Consulta del Dashboard y Tarjetas KPI</h3>
    <p style="text-align: justify;">
      Al iniciar sesión con su usuario de asesor comercial, la pestaña predeterminada es <strong>"Reportes y Cifras"</strong>. En la sección superior verá el resumen general de la eficacia de la plataforma:
    </p>
    <ul>
      <li><strong>Tarjeta "Suma Consolidada de Caja":</strong> Refleja el monto acumulado en pesos de todos los pagos que ya han sido plenamente identificados en las tiendas.</li>
      <li><strong>Tarjeta "Eficacia Conciliaria":</strong> Mide en porcentaje (%) el avance de la conciliación del mes corriente (transacciones validadas sobre transacciones totales cargadas en los extractos).</li>
    </ul>
    ${getExportMockupHtml('indicadores_kpi')}

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.2: Análisis de Participación de Ventas por Sede Física</h3>
    <p style="text-align: justify;">
      La plataforma de DEGRES S.A.S. permite a los asesores comprender la salud comercial de cada punto de venta físico del Valle de Aburrá. Para analizar las estadísticas de las sedes (Guayabal, Sabaneta y Naranjal), ubique la tarjeta <strong>"Participación por Sede Física"</strong> y use el selector de tres botones superiores para alternar la visualización contable:
    </p>
    <ol style="margin-bottom: 16px;">
      <li><strong>Botón "Barras" (Por defecto):</strong> Despliega barras horizontales que relacionan la suma total de dinero recaudado en pesos contra la cantidad física de transacciones (txs) ejecutadas.</li>
      <li><strong>Botón "Columnas":</strong> Genera una gráfica dinámica de columnas verticales en colores contrastantes corporativos, ideal para reuniones mensuales de equipo. Al pasar el cursor por encima, un recuadro emergente mostrará el valor exacto.</li>
      <li><strong>Botón "Torta":</strong> Representa la distribución porcentual exacta mediante un gráfico circular. Permite saber qué porcentaje de participación de la facturación total corresponde a cada punto de venta.</li>
    </ol>
    ${getExportMockupHtml('graficos_sede')}

    <h3 style="color: #F47920; font-size: 11pt; margin-top: 16px;">Paso 3.3: Auditoría Personal de Rendimiento de Asesores</h3>
    <p style="text-align: justify;">
      Para auditar su comisión personal y compararla frente a sus compañeros, ubique la tarjeta <strong>"Rendimiento de Asesores"</strong> en la parte derecha del panel. Utilice el selector de modo de vista superior:
    </p>
    <ul>
      <li><strong>Botón "Tabla":</strong> Muestra el listado de asesores ordenados en ranking de mayor a menor recaudo, detallando el número exacto de abonos validados por las cajeras y el monto bruto en pesos.</li>
      <li><strong>Botón "Columnas" y Botón "Torta":</strong> Permiten graficar la fuerza de ventas para propósitos de presentación ante el Director Comercial de la empresa.</li>
    </ul>
    ${getExportMockupHtml('rendimiento_asesores')}

    <h2 style="color: #1A2D7C; font-size: 13pt; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">4. BUENAS PRÁCTICAS OPERATIVAS</h2>
    <ul>
      <li><strong>Verificación de Asignación en Caja:</strong> Asegúrese de recordarle de manera cordial a la cajera su nombre completo al momento de que el cliente realice el abono por transferencia. Esto garantiza que su comisión se sume inmediatamente al sistema Firebase y aparezca en su dashboard.</li>
      <li><strong>Uso de Filtros de Consulta:</strong> En caso de requerir el análisis de un periodo específico, utilice los filtros generales en la parte superior para delimitar las fechas, montos mínimos o máximos del reporte.</li>
    </ul>
  `;

  // Helper to trigger Word download (single or unifed all)
  const handleDownloadWord = (roleKey: 'admin' | 'tesorera' | 'cajera' | 'asesor' | 'all') => {
    let title = '';
    let roleName = '';
    let manualContent = '';

    if (roleKey === 'all') {
      title = 'Manual de Usuario Unificado - DEGRES S.A.S.';
      roleName = 'Unificado_Completo';
      manualContent = `
        <div style="text-align: center; padding-top: 60px; padding-bottom: 60px; border: 4px double #1A2D7C; margin-bottom: 40px; border-radius: 8px; background-color: #f8fafc;">
          <h1 style="color: #1A2D7C; font-size: 26pt; font-weight: bold; margin-bottom: 8px;">DEGRES S.A.S.</h1>
          <h3 style="color: #F47920; font-size: 14pt; font-weight: bold; margin-top: 0; margin-bottom: 30px; tracking-widest;">PLATAFORMA CONCILIARIA DEGRES</h3>
          <div style="width: 120px; height: 3px; background-color: #F47920; margin: 20px auto;"></div>
          <h2 style="color: #1e293b; font-size: 16pt; font-weight: bold; margin-bottom: 40px; text-transform: uppercase;">MANUAL OPERATIVO DE CONCILIACIÓN BANCARIA Y CONTROL DE TRANSACCIONES</h2>
          <p style="font-size: 11pt; color: #64748b; margin-bottom: 8px;"><strong>Versión:</strong> 2.0 (Julio 2026)</p>
          <p style="font-size: 11pt; color: #64748b; margin-bottom: 8px;"><strong>Autor:</strong> Área de TI</p>
          <p style="font-size: 11pt; color: #64748b; margin-bottom: 40px;"><strong>Sedes:</strong> Guayabal, Sabaneta, Naranjal • Medellín, Colombia</p>
          <p style="font-size: 9pt; color: #94a3b8; font-style: italic; max-width: 500px; margin: 0 auto; line-height: 1.4;">
            Este documento contiene los manuales de usuario oficiales unificados para todos los roles operativos de la compañía. Su cumplimiento es obligatorio en todos los puntos de venta físicos de la organización.
          </p>
        </div>

        ${getPageBreakHtml()}
        
        <!-- INDICE DEL DOCUMENTO -->
        <h1 style="color: #1A2D7C; font-size: 18pt; font-weight: bold; border-bottom: 2px solid #F47920; padding-bottom: 6px; margin-bottom: 15px;">ÍNDICE GENERAL DEL MANUAL</h1>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #1A2D7C; color: white;">
              <th style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; text-align: left; font-size: 10pt;">Sección</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; text-align: left; font-size: 10pt;">Descripción / Módulo Operativo</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; text-align: center; font-size: 10pt; width: 100px;">Página Ref.</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt; font-weight: bold;">Manual 1</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt;">MANUAL DE USUARIO - ROL ADMINISTRADOR (Control Total y Auditoría)</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt; text-align: center; color: #64748b;">(Sección 1)</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt; font-weight: bold;">Manual 2</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt;">MANUAL DE USUARIO - ROL TESORERA (Cargue de Extractos Bancarios)</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt; text-align: center; color: #64748b;">(Sección 2)</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt; font-weight: bold;">Manual 3</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt;">MANUAL DE USUARIO - ROL CAJERA (Validación de Abonos en Caja)</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt; text-align: center; color: #64748b;">(Sección 3)</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt; font-weight: bold;">Manual 4</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt;">MANUAL DE USUARIO - ROL ASESOR COMERCIAL (Seguimiento de Comisiones)</td>
              <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 9.5pt; text-align: center; color: #64748b;">(Sección 4)</td>
            </tr>
          </tbody>
        </table>

        ${getPageBreakHtml()}
        ${getAdminManualHtml()}
        ${getPageBreakHtml()}
        ${getTesoreraManualHtml()}
        ${getPageBreakHtml()}
        ${getCajeraManualHtml()}
        ${getPageBreakHtml()}
        ${getAsesorManualHtml()}
      `;
    } else {
      title = `Manual de Usuario - ${roleKey.toUpperCase()} - DEGRES S.A.S.`;
      roleName = roleKey.toUpperCase();
      if (roleKey === 'admin') manualContent = getAdminManualHtml();
      else if (roleKey === 'tesorera') manualContent = getTesoreraManualHtml();
      else if (roleKey === 'cajera') manualContent = getCajeraManualHtml();
      else manualContent = getAsesorManualHtml();
    }

    // Build compliant styled Word HTML structure
    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${title}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page Section1 {
            size: 8.5in 11.0in;
            margin: 1.0in 1.0in 1.0in 1.0in;
            mso-header-margin: 0.5in;
            mso-footer-margin: 0.5in;
            mso-header: hdr1;
            mso-footer: ftr1;
          }
          div.Section1 {
            page: Section1;
          }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #1e293b;
          }
          h1 {
            font-family: 'Arial', sans-serif;
            font-size: 20pt;
            color: #1A2D7C;
            border-bottom: 2px solid #F47920;
            padding-bottom: 6px;
            margin-top: 24pt;
            margin-bottom: 12pt;
          }
          h2 {
            font-family: 'Arial', sans-serif;
            font-size: 14pt;
            color: #1A2D7C;
            margin-top: 18pt;
            margin-bottom: 8pt;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 3px;
          }
          h3 {
            font-family: 'Arial', sans-serif;
            font-size: 11.5pt;
            color: #F47920;
            margin-top: 12pt;
            margin-bottom: 6pt;
          }
          p {
            margin-bottom: 8pt;
            text-align: justify;
          }
          ul, ol {
            margin-top: 0;
            margin-bottom: 10pt;
            padding-left: 20px;
          }
          li {
            margin-bottom: 4pt;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10pt;
            margin-bottom: 15pt;
          }
          th {
            background-color: #1A2D7C;
            color: #ffffff;
            font-weight: bold;
            text-align: left;
            padding: 8px;
            border: 1px solid #cbd5e1;
            font-size: 10pt;
          }
          td {
            padding: 8px;
            border: 1px solid #cbd5e1;
            font-size: 10pt;
          }
          .image-placeholder {
            border: 2px dashed #94a3b8;
            background-color: #f8fafc;
            padding: 30px;
            text-align: center;
            color: #475569;
            font-style: italic;
            margin: 15pt 0;
            font-size: 9.5pt;
            border-radius: 6px;
          }
          .footer {
            margin-top: 40pt;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
            font-size: 8.5pt;
            color: #64748b;
            text-align: center;
          }
          p.MsoHeader, li.MsoHeader, div.MsoHeader {
            margin: 0in;
            margin-bottom: .0001pt;
            mso-pagination: widow-orphan;
          }
          p.MsoFooter, li.MsoFooter, div.MsoFooter {
            margin: 0in;
            margin-bottom: .0001pt;
            mso-pagination: widow-orphan;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
          <!-- Running Header for MS Word -->
          <div style="mso-element:header" id="hdr1">
            <p class="MsoHeader">
              <table width="100%" style="width: 100%; border-collapse: collapse; border: none; margin: 0 0 5px 0;">
                <tr>
                  <td style="border: none; padding: 0; text-align: left; font-family: 'Arial', sans-serif; font-size: 8.5pt; color: #64748b; vertical-align: middle;">
                    Plataforma Conciliaria DEGRES S.A.S. — Manual de Usuario
                  </td>
                  <td style="border: none; padding: 0; text-align: right; vertical-align: middle;">
                    <span style="font-family: 'Arial', sans-serif; font-size: 11pt; font-weight: bold; color: #1A2D7C; letter-spacing: 0.5px;">DEGRES S.A.S.</span>
                  </td>
                </tr>
              </table>
              <div style="border-top: 1px solid #cbd5e1; font-size: 1px; line-height: 1px; margin-top: 2px; margin-bottom: 15px;">&nbsp;</div>
            </p>
          </div>

          <!-- Running Footer for MS Word -->
          <div style="mso-element:footer" id="ftr1">
            <p class="MsoFooter">
              <div style="border-top: 1px solid #cbd5e1; font-size: 1px; line-height: 1px; margin-bottom: 8px;">&nbsp;</div>
              <table width="100%" style="width: 100%; border-collapse: collapse; border: none; margin: 0;">
                <tr>
                  <td style="border: none; padding: 0; text-align: left; font-family: 'Arial', sans-serif; font-size: 8pt; color: #94a3b8; vertical-align: middle;">
                    Documento Oficial • Confidencial DEGRES S.A.S.
                  </td>
                  <td style="border: none; padding: 0; text-align: right; font-family: 'Arial', sans-serif; font-size: 8pt; color: #94a3b8; vertical-align: middle;">
                    Documento Oficial DEGRES S.A.S. • Área de TI
                  </td>
                </tr>
              </table>
            </p>
          </div>

          ${manualContent}
          
          <div class="footer">
            Documento Confidencial de DEGRES S.A.S. • Área de TI • Todos los derechos reservados • 2026
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + docHtml], {
      type: 'application/msword;charset=utf-8'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Manual_Usuario_${roleName}_DEGRES.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isUserAdmin = currentUser.role === 'Admin';
  const [printTarget, setPrintTarget] = useState<'active' | 'all'>('active');
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  const handleDownloadPdf = (target: 'active' | 'all') => {
    setPrintTarget(target);
    setPdfPreviewOpen(true);
    // Auto-trigger browser print dialog after modal mounts
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-[#1A2D7C] p-6 rounded-2xl text-white shadow-md relative overflow-hidden border-b-4 border-[#F47920]">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 w-40 h-40 bg-white/5 rounded-full -mb-20 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <span className="text-[10px] font-black tracking-widest bg-[#F47920] px-3 py-1 rounded-full uppercase">
              DOCUMENTACIÓN OFICIAL DEGRES S.A.S.
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase font-space tracking-tight">
              Manuales Operativos de Usuario
            </h2>
            <p className="text-xs text-indigo-150 leading-relaxed max-w-xl font-medium">
              Consulta el paso a paso de los módulos y botones diseñados a medida para tu rol. Descarga los documentos de Word listos para anexar capturas de pantalla de tu terminal.
            </p>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl border border-white/20 self-start md:self-auto flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-[#F47920] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Grid: Navigation & Content area */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Left Column: Tab switcher (Only fully visible for Admin, static info for specific roles) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-150 pb-3">
            <h3 className="text-xs uppercase font-black tracking-widest text-[#1A2D7C] flex items-center gap-2 font-space">
              <Users className="h-4.5 w-4.5 text-[#F47920]" />
              {isUserAdmin ? "MANUALES DISPONIBLES" : "MI MANUAL ASIGNADO"}
            </h3>
          </div>

          {isUserAdmin ? (
            /* Admin can select any of the manuals to read and download */
            <div className="space-y-2.5">
              <button
                id="btn-manual-select-admin"
                type="button"
                onClick={() => setActiveManual('admin')}
                className={`w-full p-3.5 rounded-xl text-left border-2 transition-all flex items-center justify-between group ${
                  activeManual === 'admin'
                    ? 'bg-indigo-50/50 border-indigo-600 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${activeManual === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                    <Settings className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-700 font-space tracking-wider">1. Administrador</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Control Maestro e Auditoría</p>
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 transition-transform ${activeManual === 'admin' ? 'text-indigo-600 translate-x-1' : 'text-slate-300'}`} />
              </button>

              <button
                id="btn-manual-select-tesorera"
                type="button"
                onClick={() => setActiveManual('tesorera')}
                className={`w-full p-3.5 rounded-xl text-left border-2 transition-all flex items-center justify-between group ${
                  activeManual === 'tesorera'
                    ? 'bg-blue-50/50 border-blue-600 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${activeManual === 'tesorera' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-700 font-space tracking-wider">2. Tesorera</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Carga de Movimientos</p>
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 transition-transform ${activeManual === 'tesorera' ? 'text-blue-600 translate-x-1' : 'text-slate-300'}`} />
              </button>

              <button
                id="btn-manual-select-cajera"
                type="button"
                onClick={() => setActiveManual('cajera')}
                className={`w-full p-3.5 rounded-xl text-left border-2 transition-all flex items-center justify-between group ${
                  activeManual === 'cajera'
                    ? 'bg-emerald-50/50 border-emerald-600 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${activeManual === 'cajera' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                    <CheckSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-700 font-space tracking-wider">3. Cajera de Sede</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Validación en Tienda</p>
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 transition-transform ${activeManual === 'cajera' ? 'text-emerald-600 translate-x-1' : 'text-slate-300'}`} />
              </button>

              <button
                id="btn-manual-select-asesor"
                type="button"
                onClick={() => setActiveManual('asesor')}
                className={`w-full p-3.5 rounded-xl text-left border-2 transition-all flex items-center justify-between group ${
                  activeManual === 'asesor'
                    ? 'bg-amber-50/50 border-amber-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${activeManual === 'asesor' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-700 font-space tracking-wider">4. Asesor Comercial</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Métricas de Comisiones</p>
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 transition-transform ${activeManual === 'asesor' ? 'text-amber-500 translate-x-1' : 'text-slate-300'}`} />
              </button>
            </div>
          ) : (
            /* Standard user roles only see their own role title locked */
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-3">
              <div className="flex items-center gap-2 text-[#1A2D7C]">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-xs font-black uppercase font-space">
                  {currentUser.role === 'Tesorera' ? 'Perfil Tesorera Validado' :
                   currentUser.role === 'Cajera' ? 'Perfil Cajera Validado' : 'Perfil Asesor Comercial'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                De acuerdo con las políticas de seguridad de la información de DEGRES S.A.S., su usuario tiene bloqueado el acceso a los manuales de otros departamentos. Puede visualizar e imprimir su manual asignado.
              </p>
            </div>
          )}

          {/* Admin Specific Download All Actions */}
          {isUserAdmin && (
            <div className="pt-4 border-t border-slate-150 space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-700 font-space tracking-wider">
                Acciones de Administración
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-download-all-manuals-unified-word"
                  type="button"
                  onClick={() => handleDownloadWord('all')}
                  className="flex items-center justify-center gap-2 bg-[#F47920] hover:bg-[#F47920]/90 text-white text-[9px] font-black uppercase px-3 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer border-b-2 border-orange-800"
                  title="Descargar todos los manuales consolidados en un único archivo de Word"
                >
                  <FileDown className="h-4 w-4 text-white" />
                  Word Unificado
                </button>
                <button
                  id="btn-download-all-manuals-unified-pdf"
                  type="button"
                  onClick={() => handleDownloadPdf('all')}
                  className="flex items-center justify-center gap-2 bg-[#1A2D7C] hover:bg-[#1A2D7C]/90 text-white text-[9px] font-black uppercase px-3 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer border-b-2 border-indigo-900"
                  title="Descargar todos los manuales consolidados en un único archivo PDF"
                >
                  <FileText className="h-4 w-4 text-[#F47920]" />
                  PDF Unificado
                </button>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase text-center mt-1">
                Genera un solo pack con portada e índice
              </p>
            </div>
          )}

          {/* Information Notice Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-2">
            <h5 className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5 font-space">
              <Info className="h-3.5 w-3.5 text-[#1A2D7C]" />
              POLÍTICA DE CONTROL DE DEGRES
            </h5>
            <p className="text-[10px] text-slate-550 leading-relaxed font-medium">
              Cada manual incluye recuadros de captura digital con mockups interactivos. Para su descarga en Word, puede sustituir o complementar estas imágenes con capturas directas de su terminal física de trabajo.
            </p>
          </div>
        </div>

        {/* Right Column: Previsualization Panel */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                activeManual === 'admin' ? 'bg-indigo-600' :
                activeManual === 'tesorera' ? 'bg-blue-600' :
                activeManual === 'cajera' ? 'bg-emerald-600' : 'bg-amber-500'
              }`} />
              <h3 className="text-xs uppercase font-black tracking-widest text-[#1A2D7C] font-space">
                PREVISUALIZACIÓN DEL DOCUMENTO DE EXPORTACIÓN
              </h3>
            </div>
            
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                id="btn-download-pdf-manual"
                type="button"
                onClick={() => handleDownloadPdf('active')}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-space font-black uppercase text-[10px] tracking-wider px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                title="Generar e imprimir el manual activo en formato PDF"
              >
                <FileText className="h-4 w-4" />
                Descargar (PDF)
              </button>

              {isUserAdmin && (
                <button
                  id="btn-download-word-manual"
                  type="button"
                  onClick={() => handleDownloadWord(activeManual)}
                  className="flex items-center justify-center gap-2 bg-[#F47920] hover:bg-[#F47920]/90 text-white font-space font-black uppercase text-[10px] tracking-wider px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                  title="Descargar el manual activo editable en formato de Microsoft Word (.doc)"
                >
                  <Download className="h-4 w-4" />
                  Descargar (Word)
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Previsualization Box */}
          <div className="flex-1 overflow-y-auto max-h-[500px] border border-slate-150 p-6 rounded-xl bg-slate-50/50 space-y-6 text-xs text-slate-700 leading-relaxed font-sans scrollbar-thin">
            
            {/* Standard corporate introduction */}
            <div className="bg-white p-4 rounded-xl border-l-4 border-[#F47920] shadow-sm space-y-2">
              <h4 className="text-xs font-black uppercase text-[#1A2D7C] font-space flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-[#F47920]" />
                1. INTRODUCCIÓN INSTITUCIONAL: DEGRES S.A.S.
              </h4>
              <p className="font-medium text-[11px] text-slate-600 leading-relaxed">
                <strong>DEGRES S.A.S.</strong> es una organización líder en la comercialización y distribución de acabados arquitectónicos premium, cerámicas, porcelanatos, grifería y revestimientos de alta especificación. Con el fin de sostener la excelencia operativa y la transparencia en sus puntos de venta principales del Valle de Aburrá (las sedes físicas de <strong>Guayabal</strong>, <strong>Sabaneta</strong> y <strong>Naranjal</strong>), la compañía ha adoptado herramientas de automatización de vanguardia para sus procesos contables.
              </p>
              <p className="font-medium text-[11px] text-slate-600 leading-relaxed">
                La <strong>Plataforma Conciliaria DEGRES</strong> es una solución de software web diseñada para optimizar, centralizar y conciliar en tiempo real los abonos y pagos que los clientes efectúan a través de transferencias bancarias directas y códigos QR corporativos de Bancolombia. Este aplicativo elimina el riesgo de fraudes, evita dobles registros, previene la entrega de mercancías sin soporte bancario verificado, y calcula de manera exacta las comisiones para nuestros Asesores Comerciales.
              </p>
            </div>

            {/* Admin Manual Content Previsual */}
            {activeManual === 'admin' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <h4 className="text-sm font-black uppercase text-[#1A2D7C] font-space border-b border-slate-200 pb-1">
                  MANUAL DE USUARIO - ROL ADMINISTRADOR (CONTROL MAESTRO)
                </h4>
                
                <div className="space-y-2">
                  <h5 className="font-bold text-[#F47920] uppercase text-[11px] flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    2. Perfil Administrativo: Atribuciones y Alcance
                  </h5>
                  <p>
                    El perfil de <strong>Administrador</strong> dentro de la Plataforma Conciliaria tiene acceso irrestricto de lectura y escritura sobre todos los módulos del sistema. Su misión fundamental es auditar la correspondencia entre los abonos conciliados, corregir inconsistencias del personal en caja y preparar el sistema para nuevos periodos contables.
                  </p>
                </div>

                <div className="space-y-2">
                  <h5 className="font-bold text-[#F47920] uppercase text-[11px] flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    3. Paso a Paso: Mapeo y Operaciones Críticas
                  </h5>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <p className="font-bold text-[#1A2D7C]">Paso 3.1: Uso de la Herramienta de Simulación de Perfiles</p>
                    <p>
                      Para verificar el comportamiento de los perfiles en tiempo real, use el selector desplegable <strong>"Simulando Usuario:"</strong> ubicado en el encabezado de la barra superior. Seleccione el usuario deseado y haga clic para aplicar las políticas de navegación y restricciones automáticas.
                    </p>
                    <MockupImage type="simulacion_usuarios" />
                  </div>
 
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 mt-3">
                    <p className="font-bold text-[#1A2D7C]">Paso 3.2: Configuración del Dashboard de Reportes (Switches)</p>
                    <p>
                      En el <strong>AdminPanel</strong>, localice los switches en la sección de "Configuración de Pantallas de Reportes" para habilitar o deshabilitar tarjetas críticas como la Suma Consolidada, Eficacia Conciliaria, Participación por Sede, Rendimiento de Asesores o los Filtros Generales de las Cajeras.
                    </p>
                    <MockupImage type="interruptores" />
                  </div>
 
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 mt-3">
                    <p className="font-bold text-[#1A2D7C]">Paso 3.3: Auditoría en Tiempo Real de Operaciones</p>
                    <p>
                      Consulte la sección <strong>"Auditoría en Tiempo Real de la Plataforma"</strong>. Revise la correspondencia entre los logs, identificando qué usuario validó cada abono, en qué sede física, la fecha exacta, los segundos de la marca del servidor y el monto asignado.
                    </p>
                    <MockupImage type="auditoria" />
                  </div>
 
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 mt-3">
                    <p className="font-bold text-[#1A2D7C]">Paso 3.4: Reversiones de Datos y Limpieza de Firestore</p>
                    <p>
                      Utilice los botones de acción rápida de datos: <strong>"Revertir Conciliaciones"</strong> para restablecer todos los registros a Pendiente y recalcular indicadores, o <strong>"Reiniciar Base de Datos"</strong> para limpiar por completo la base de datos de abonos, ejecutando la doble confirmación de seguridad.
                    </p>
                    <MockupImage type="limpieza_db" />
                  </div>
                </div>
              </div>
            )}
 
            {activeManual === 'tesorera' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <h4 className="text-sm font-black uppercase text-[#1A2D7C] font-space border-b border-slate-200 pb-1">
                  MANUAL DE USUARIO - ROL TESORERA (CARGUE DE EXTRACTOS)
                </h4>
 
                <div className="space-y-2">
                  <h5 className="font-bold text-[#F47920] uppercase text-[11px] flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    2. Responsabilidad Operativa en Tesorería
                  </h5>
                  <p>
                    La <strong>Tesorera</strong> tiene bajo su control exclusivo la importación de extractos bancarios que darán vida a las transacciones pendientes que luego serán conciliadas en los puntos de venta de DEGRES S.A.S.
                  </p>
                </div>
 
                <div className="space-y-2">
                  <h5 className="font-bold text-[#F47920] uppercase text-[11px] flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    3. Procedimiento Operativo Paso a Paso: "Cargar Banco"
                  </h5>
 
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <p className="font-bold text-[#1A2D7C]">Paso 3.1 y 3.2: Descarga del Extracto Bancario y Zona de Carga</p>
                    <p>
                      Descargue el extracto en formato compatible Excel desde su portal empresarial. Diríjase a la pestaña <strong>"Cargar Banco"</strong> en la plataforma. Arrastre el archivo dentro de la nube interactiva de carga de archivos o haga clic para cargarlo localmente.
                    </p>
                    <MockupImage type="cargar_banco" />
                  </div>
 
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 mt-3">
                    <p className="font-bold text-[#1A2D7C]">Paso 3.3: Selección de Sede Contable / Cuenta de Destino</p>
                    <p>
                      Despliegue el selector <strong>"Asignar Sede / Cuenta de Destino"</strong>. Seleccione la sede correspondiente al archivo (Guayabal ***6519, Sabaneta ***0916 o Naranjal ***6807) para automatizar la pertenencia del abono.
                    </p>
                    <MockupImage type="sede_cuenta" />
                  </div>
 
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 mt-3">
                    <p className="font-bold text-[#1A2D7C]">Paso 3.4: Mapeo Inteligente de Columnas</p>
                    <p>
                      Asocie cada campo requerido de la base de datos de DEGRES (Fecha, Referencia, Monto, Descripción) con la columna respectiva de su archivo de Excel mediante los dropdowns dinámicos. Esto previene pérdidas accidentales de datos.
                    </p>
                    <MockupImage type="mapeo_columnas" />
                  </div>
 
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 mt-3">
                    <p className="font-bold text-[#1A2D7C]">Paso 3.5: Confirmación de Carga Contable</p>
                    <p>
                      Haga clic en <strong>"Procesar y Guardar"</strong>. Analice la tarjeta resumen de resultados que detalla los abonos que ingresaron, los duplicados que fueron bloqueados por seguridad, y la suma total de dinero importado en pesos colombianos.
                    </p>
                    <MockupImage type="resumen_carga" />
                  </div>
                </div>
              </div>
            )}
 
            {activeManual === 'cajera' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <h4 className="text-sm font-black uppercase text-[#1A2D7C] font-space border-b border-slate-200 pb-1">
                  MANUAL DE USUARIO - ROL CAJERA (VALIDACIÓN DE ABONOS EN CAJA)
                </h4>
 
                <div className="space-y-2">
                  <h5 className="font-bold text-[#F47920] uppercase text-[11px] flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    2. Responsabilidad Crítica en Puntos de Venta
                  </h5>
                  <p>
                    La <strong>Cajera</strong> es el filtro maestro de control de activos de DEGRES S.A.S. Su labor asegura que ninguna entrega de acabados arquitectónicos se realice sin que el abono se encuentre en la plataforma.
                  </p>
                  <p className="font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-[10px]">
                    POLÍTICA IMPERATIVA: Queda estrictamente prohibido despachar material o facturar basándose únicamente en comprobantes físicos o capturas de celular del cliente. El abono debe ser conciliado e "Identificado" en el sistema.
                  </p>
                </div>
 
                <div className="space-y-2">
                  <h5 className="font-bold text-[#F47920] uppercase text-[11px] flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    3. Paso a Paso: Proceso de Conciliación en Caja
                  </h5>
 
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <p className="font-bold text-[#1A2D7C]">Paso 3.1: Pantalla "Validar Transacciones" por Sede</p>
                    <p>
                      Ingrese a la pestaña <strong>"Validar Transacciones"</strong>. El sistema filtrará automáticamente y le presentará los abonos entrantes de su sede física correspondientes a la cuenta de recaudo.
                    </p>
                    <MockupImage type="validar_transacciones_caja" />
                  </div>
 
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 mt-3">
                    <p className="font-bold text-[#1A2D7C]">Paso 3.2: Uso Rápido de Filtros y Buscador</p>
                    <p>
                      Solicite los datos del abono del cliente. Digite el valor exacto o la referencia del comprobante de transferencia en el casillero <strong>"Buscador de Abonos..."</strong>. Use el filtro de cuenta bancaria si es preciso.
                    </p>
                    <MockupImage type="buscador_abonos" />
                  </div>
 
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 mt-3">
                    <p className="font-bold text-[#1A2D7C]">Paso 3.3 y 3.4: Diligenciamiento de Formulario de Identificación de Pago</p>
                    <p>
                      Ubique el abono y presione el botón <strong>"Identificar Pago"</strong>. En el formulario emergente, digite el Nombre del Cliente, Cédula / NIT, seleccione el <strong>Asesor Comercial</strong> de la lista y presione <strong>"Guardar Validación"</strong>. La fila se tornará verde con estado "IDENTIFICADA".
                    </p>
                    <MockupImage type="formulario_conciliacion" />
                  </div>
 
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 mt-3">
                    <p className="font-bold text-[#1A2D7C]">Paso 3.5: Uso de la Asistencia de Caja (Chat y Google Meet)</p>
                    <p>
                      Si la transferencia no aparece en los movimientos o requiere ayuda de soporte de Tesorería, presione los botones flotantes inferiores para chatear en tiempo real o generar una videollamada de Google Meet directa para compartir su pantalla.
                    </p>
                    <MockupImage type="chat_google_meet" />
                  </div>
                </div>
              </div>
            )}
 
            {activeManual === 'asesor' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <h4 className="text-sm font-black uppercase text-[#1A2D7C] font-space border-b border-slate-200 pb-1">
                  MANUAL DE USUARIO - ROL ASESOR COMERCIAL (MONITOREO DE VENTAS)
                </h4>
 
                <div className="space-y-2">
                  <h5 className="font-bold text-[#F47920] uppercase text-[11px] flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    2. Rol del Asesor Comercial en la Plataforma
                  </h5>
                  <p>
                    El perfil de <strong>Asesor Comercial</strong> tiene permisos de lectura para auditar de forma ágil el total de sus abonos identificados y verificar que las comisiones mensuales concuerden con su contabilidad de ventas físicas.
                  </p>
                </div>
 
                <div className="space-y-2">
                  <h5 className="font-bold text-[#F47920] uppercase text-[11px] flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    3. Paso a Paso: Seguimiento de Metas y Gráficos
                  </h5>
 
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <p className="font-bold text-[#1A2D7C]">Paso 3.1: Consulta del Dashboard y Indicadores KPI</p>
                    <p>
                      Al ingresar, visualice las tarjetas superiores de <strong>Suma Consolidada de Caja</strong> y <strong>Eficacia Conciliaria</strong> para comprender el porcentaje global de transacciones conciliadas del periodo contable actual.
                    </p>
                    <MockupImage type="indicadores_kpi" />
                  </div>
 
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 mt-3">
                    <p className="font-bold text-[#1A2D7C]">Paso 3.2: Participación de Ventas por Sede Física</p>
                    <p>
                      Analice los aportes de las tiendas físicas en el panel "Participación por Sede Física". Utilice las tres pestañas <strong>BARRAS</strong>, <strong>COLUMNAS</strong> y <strong>TORTA</strong> para alternar el gráfico de distribución en pesos y transacciones.
                    </p>
                    <MockupImage type="graficos_sede" />
                  </div>
 
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 mt-3">
                    <p className="font-bold text-[#1A2D7C]">Paso 3.3: Tabla de Rendimiento y Ranking de Asesores</p>
                    <p>
                      En la sección de <strong>Rendimiento de Asesores</strong>, verifique el listado completo del equipo, el número de abonos identificados a su nombre y el total recaudado. Al igual que el de sedes, puede alternar entre vista de Tabla, Columnas o Torta para sus reuniones de equipo.
                    </p>
                    <MockupImage type="rendimiento_asesores" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF Export & Print Preview Modal */}
      {pdfPreviewOpen && (
        <div className="pdf-preview-modal-backdrop fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto p-3 sm:p-6">
          <div className="pdf-preview-modal-card w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
            
            {/* Modal Top Bar (Hidden on print) */}
            <div className="no-print bg-[#1A2D7C] text-white p-4 px-6 flex flex-wrap items-center justify-between gap-3 shadow-md border-b-4 border-[#F47920]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl border border-white/20">
                  <FileText className="h-5 w-5 text-[#F47920]" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase font-space tracking-wide text-white">
                    Vista Previa Oficial del Manual para Guardar en PDF
                  </h3>
                  <p className="text-[10px] text-slate-300 font-medium">
                    Elaborado por el <strong>Área de TI</strong> • Al imprimir, elija la opción <strong>"Guardar como PDF"</strong> en su navegador.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 bg-[#F47920] hover:bg-[#e06810] text-white font-space font-black uppercase text-[10px] sm:text-[11px] px-4 py-2.5 rounded-xl shadow transition-colors cursor-pointer border-b-2 border-orange-800"
                >
                  <Download className="h-4 w-4" />
                  🖨️ Guardar en PDF / Imprimir
                </button>
                
                <button
                  type="button"
                  onClick={() => setPdfPreviewOpen(false)}
                  className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-white/20"
                  title="Cerrar vista previa"
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>

            {/* Modal Body Container */}
            <div className="pdf-preview-modal-body flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100/80 text-slate-800 scrollbar-thin">
              <div className="printable-document-container max-w-4xl mx-auto bg-white p-6 md:p-12 shadow-lg rounded-xl border border-slate-200 text-xs leading-relaxed font-sans">
                
                {/* Document Header */}
                <div className="flex items-center justify-between border-b-2 border-[#1A2D7C] pb-4 mb-8">
                  <div>
                    <h2 className="text-base font-black text-[#1A2D7C] uppercase tracking-wide font-space">DEGRES S.A.S.</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Plataforma Conciliaria • Documentación Oficial</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-[#1A2D7C]">DEGRES S.A.S.</span>
                    <p className="text-[9px] text-slate-500 font-bold uppercase">Área de TI</p>
                  </div>
                </div>

                {/* Content based on print target */}
                {printTarget === 'all' ? (
                  <div className="space-y-8">
                    <div className="text-center py-12 border-4 border-double border-[#1A2D7C] rounded-xl bg-slate-50 mb-8">
                      <h1 className="text-2xl font-black text-[#1A2D7C] uppercase font-space">DEGRES S.A.S.</h1>
                      <p className="text-xs font-black tracking-widest text-[#F47920] uppercase mt-1">PLATAFORMA CONCILIARIA DEGRES</p>
                      <div className="w-16 h-1 bg-[#F47920] mx-auto my-5"></div>
                      <h2 className="text-sm font-black text-slate-800 uppercase max-w-md mx-auto">MANUAL OPERATIVO DE CONCILIACIÓN BANCARIA Y CONTROL DE TRANSACCIONES UNIFICADO</h2>
                      <div className="text-[10px] text-slate-550 space-y-1 mt-8 font-medium">
                        <p><strong>Versión:</strong> 2.0 (Julio 2026)</p>
                        <p><strong>Autor:</strong> Área de TI</p>
                        <p><strong>Sedes:</strong> Guayabal, Sabaneta, Naranjal • Medellín, Colombia</p>
                      </div>
                    </div>

                    <div className="page-break"></div>
                    <div dangerouslySetInnerHTML={{ __html: getAdminManualHtml() }} />
                    <div className="page-break"></div>
                    <div dangerouslySetInnerHTML={{ __html: getTesoreraManualHtml() }} />
                    <div className="page-break"></div>
                    <div dangerouslySetInnerHTML={{ __html: getCajeraManualHtml() }} />
                    <div className="page-break"></div>
                    <div dangerouslySetInnerHTML={{ __html: getAsesorManualHtml() }} />
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: 
                    activeManual === 'admin' ? getAdminManualHtml() :
                    activeManual === 'tesorera' ? getTesoreraManualHtml() :
                    activeManual === 'cajera' ? getCajeraManualHtml() : getAsesorManualHtml()
                  }} />
                )}

                <div className="border-t border-slate-300 pt-4 mt-12 text-center text-[9px] text-slate-400 font-medium">
                  Documento Oficial Confidencial de DEGRES S.A.S. • Creado por el Área de TI • Todos los derechos reservados • 2026
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden printable container for PDF generation fallback */}
      <div id="printable-area" className="hidden print:block text-slate-900 bg-white p-8">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            #root > div:not(#printable-area),
            #root > main,
            #root > section,
            #root > header,
            nav,
            aside,
            button,
            footer {
              display: none !important;
            }
            @page {
              size: letter;
              margin: 1in;
            }
            #printable-area {
              display: block !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .print-page-break {
              page-break-before: always;
              clear: both;
            }
          }
        `}} />

        {/* Corporate header for printed PDF */}
        <div className="flex items-center justify-between border-b border-slate-300 pb-3 mb-6">
          <div className="text-left">
            <h2 className="text-sm font-black text-[#1A2D7C] tracking-wide uppercase font-space">DEGRES S.A.S.</h2>
            <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">Plataforma Conciliaria • Manual de Usuario</p>
          </div>
          <img src={logoBase64} width="115" height="28" alt="DEGRES S.A.S." />
        </div>

        {/* Dynamic content depending on print target */}
        {printTarget === 'all' ? (
          <div className="space-y-8">
            <div className="text-center py-16 border-4 border-double border-[#1A2D7C] rounded-xl bg-slate-50 mb-8">
              <h1 className="text-2xl font-black text-[#1A2D7C] uppercase">DEGRES S.A.S.</h1>
              <p className="text-xs font-black tracking-widest text-[#F47920] uppercase mt-1">PLATAFORMA CONCILIARIA DEGRES</p>
              <div className="w-16 h-1 bg-[#F47920] mx-auto my-6"></div>
              <h2 className="text-sm font-black text-slate-800 uppercase max-w-md mx-auto">MANUAL OPERATIVO DE CONCILIACIÓN BANCARIA Y CONTROL DE TRANSACCIONES UNIFICADO</h2>
              <div className="text-[10px] text-slate-550 space-y-1 mt-10 font-medium">
                <p><strong>Versión:</strong> 2.0 (Julio 2026)</p>
                <p><strong>Autor:</strong> Área de TI</p>
                <p><strong>Sedes:</strong> Guayabal, Sabaneta, Naranjal • Medellín, Colombia</p>
              </div>
            </div>

            <div className="print-page-break"></div>
            <div dangerouslySetInnerHTML={{ __html: getAdminManualHtml() }} />
            <div className="print-page-break"></div>
            <div dangerouslySetInnerHTML={{ __html: getTesoreraManualHtml() }} />
            <div className="print-page-break"></div>
            <div dangerouslySetInnerHTML={{ __html: getCajeraManualHtml() }} />
            <div className="print-page-break"></div>
            <div dangerouslySetInnerHTML={{ __html: getAsesorManualHtml() }} />
          </div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: 
            activeManual === 'admin' ? getAdminManualHtml() :
            activeManual === 'tesorera' ? getTesoreraManualHtml() :
            activeManual === 'cajera' ? getCajeraManualHtml() : getAsesorManualHtml()
          }} />
        )}

        <div className="border-t border-slate-300 pt-3 mt-12 text-center text-[9px] text-slate-400">
          Documento Oficial • Confidencial DEGRES S.A.S. • Área de TI • Todos los derechos reservados • 2026
        </div>
      </div>
    </div>
  );
}
