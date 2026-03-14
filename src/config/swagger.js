const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'SAP PM Emulator API',
    version: '1.0.0',
    description: 'SAP PM Emulator — AxionGO Integration Layer\n\nREST API that emulates SAP PM (Plant Maintenance) module endpoints. Responses follow the SAP OData format: `{ d: { results: [...] } }`.',
    contact: {
      name: 'SAP PM Emulator',
    },
  },
  servers: [
    {
      url: '/sap/opu/odata/sap',
      description: 'SAP PM Emulator — AxionGO Integration Layer',
    },
  ],
  tags: [
    { name: '🔵 SAP ECC', description: 'SAP ECC Endpoints' },
    { name: 'PM_EQUIPMENT_SRV', description: 'Equipamentos e Locais de Instalação (EQUI, IFLOT)' },
    { name: 'PM_NOTIFICATION_SRV', description: 'Notas de Manutenção (QMEL)' },
    { name: 'PM_ORDER_SRV', description: 'Ordens de Manutenção (AUFK, AFKO)' },
    { name: 'PM_MAINTPLAN_SRV', description: 'Planos de Manutenção Preventiva (MMPT, PLPO)' },
    { name: 'PM_MEASPOINT_SRV', description: 'Pontos de Medição (IMPTT)' },
    { name: 'PM_MATERIAL_SRV', description: 'Materiais e Movimentações (MARA, RESB, MSEG)' },
    { name: 'PM_ANALYTICS_SRV', description: 'Consultas Analíticas (AxionGO AI)' },
  ],
  components: {
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'INTERNAL_ERROR' },
              message: {
                type: 'object',
                properties: {
                  lang: { type: 'string', example: 'pt-BR' },
                  value: { type: 'string', example: 'Mensagem de erro detalhada' }
                }
              }
            }
          }
        }
      },
      ODataListResponse: {
        type: 'object',
        properties: {
          d: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: { type: 'object' }
              }
            }
          }
        }
      },
      ODataSingleResponse: {
        type: 'object',
        properties: {
          d: { type: 'object' }
        }
      },
      EQUI: {
        type: 'object',
        properties: {
          EQUNR: { type: 'string', description: 'Nº do equipamento' },
          EQTXT: { type: 'string', description: 'Descrição do equipamento' },
          TPLNR: { type: 'string', description: 'Local de instalação (FK IFLOT)' },
          IWERK: { type: 'string', description: 'Centro de planejamento' },
          KOSTL: { type: 'string', description: 'Centro de custo' },
          BUKRS: { type: 'string', description: 'Empresa' },
          ERDAT: { type: 'string', description: 'Data de criação (YYYYMMDD)' },
          AEDAT: { type: 'string', description: 'Data de modificação' },
          EQART: { type: 'string', description: 'Tipo de equipamento' },
          SERGE: { type: 'string', description: 'Nº de série' },
          BAUJJ: { type: 'string', description: 'Ano de construção' },
          ANSWT: { type: 'number', description: 'Valor de aquisição' },
          WAERS: { type: 'string', description: 'Moeda' }
        }
      },
      IFLOT: {
        type: 'object',
        properties: {
          TPLNR: { type: 'string', description: 'Local de instalação' },
          PLTXT: { type: 'string', description: 'Descrição do local de instalação' },
          IWERK: { type: 'string', description: 'Centro de planejamento' },
          SWERK: { type: 'string', description: 'Centro de manutenção' },
          KOSTL: { type: 'string', description: 'Centro de custo' },
          BUKRS: { type: 'string', description: 'Empresa' },
          ERDAT: { type: 'string', description: 'Data de criação' },
          AEDAT: { type: 'string', description: 'Data de modificação' },
          STOCKTYPE: { type: 'string', description: 'Tipo de estoque' },
          FLTYP: { type: 'string', description: 'Categoria do local funcional' }
        }
      },
      QMEL: {
        type: 'object',
        properties: {
          QMNUM: { type: 'string', description: 'Nº da nota' },
          QMART: { type: 'string', description: 'Tipo de nota (M1, M2, M3)' },
          QMTXT: { type: 'string', description: 'Texto breve da nota' },
          EQUNR: { type: 'string', description: 'Equipamento' },
          TPLNR: { type: 'string', description: 'Local de instalação' },
          IWERK: { type: 'string', description: 'Centro' },
          PRIOK: { type: 'string', description: 'Prioridade (1, 2, 3, 4)' },
          QMCOD: { type: 'string', description: 'Código do sintoma' },
          ERDAT: { type: 'string', description: 'Data de criação (YYYYMMDD)' },
          ERNAM: { type: 'string', description: 'Criador' },
          LTRMN: { type: 'string', description: 'Data limite desejada' },
          ARBPL: { type: 'string', description: 'Centro do trabalho' },
          KOSTL: { type: 'string', description: 'Centro de custo' },
          QMST: { type: 'string', description: 'Status (ABER, INEX, CONC)' }
        }
      },
      AUFK: {
        type: 'object',
        properties: {
          AUFNR: { type: 'string', description: 'Nº da Ordem' },
          AUART: { type: 'string', description: 'Tipo de Ordem (PM01, PM02, PM03)' },
          AUTXT: { type: 'string', description: 'Texto da ordem' },
          EQUNR: { type: 'string', description: 'Equipamento (FK EQUI)' },
          TPLNR: { type: 'string', description: 'Local instalação (FK IFLOT)' },
          IWERK: { type: 'string', description: 'Centro de planejamento' },
          PRIOK: { type: 'string', description: 'Prioridade (1, 2, 3, 4)' },
          KOSTL: { type: 'string', description: 'Centro de custo' },
          ERDAT: { type: 'string', description: 'Data de criação (YYYYMMDD)' },
          ERNAM: { type: 'string', description: 'Criador' },
          GSTRP: { type: 'string', description: 'Data início planejada (YYYYMMDD)' },
          GLTRP: { type: 'string', description: 'Data fim planejada (YYYYMMDD)' },
          ARBPL: { type: 'string', description: 'Centro de trabalho' },
          AUFST: { type: 'string', description: 'Status interno (CRTD, REL, TECO, CLSD)' },
          QMNUM: { type: 'string', description: 'Nota de manutenção (AFKO)' },
          GMNGA: { type: 'number', description: 'Qtd yield (AFKO)' },
          WEMNG: { type: 'number', description: 'Qtd recebida (AFKO)' },
          RMNGA: { type: 'number', description: 'Qtd refugo (AFKO)' }
        }
      },
      MMPT_PLPO: {
        type: 'object',
        properties: {
          WARPL: { type: 'string', description: 'Nº do plano de manutenção' },
          WPTXT: { type: 'string', description: 'Texto do plano de manutenção' },
          IWERK: { type: 'string', description: 'Centro de planejamento de manutenção' },
          EQUNR: { type: 'string', description: 'Equipamento' },
          TPLNR: { type: 'string', description: 'Local de instalação' },
          ZYKL1: { type: 'number', description: 'Ciclo de manutenção (ex: 30)' },
          ZEINH: { type: 'string', description: 'Unidade do ciclo (ex: D para Dias)' },
          STRAT: { type: 'string', description: 'Estratégia de manutenção' },
          NPLDA: { type: 'string', description: 'Data planejada seguinte (calculada: LPLDA + ZYKL1)' },
          LPLDA: { type: 'string', description: 'Data da última execução' },
          WAPOS: { type: 'string', description: 'Item de manutenção' },
          PLPO_TASKS: { 
            type: 'array', 
            items: { $ref: '#/components/schemas/PLPO' },
            description: 'Lista de tarefas associadas ao plano'
          }
        }
      },
      PLPO: {
        type: 'object',
        properties: {
          PLNTY: { type: 'string', description: 'Tipo do roteiro' },
          PLNNR: { type: 'string', description: 'Chave do grupo de roteiro' },
          PLNKN: { type: 'string', description: 'Contador de roteiros' },
          WARPL: { type: 'string', description: 'Nº do plano de manutenção (FK MMPT)' },
          LTXA1: { type: 'string', description: 'Descrição da operação' },
          ARBPL: { type: 'string', description: 'Centro de trabalho' },
          VSTEL: { type: 'string', description: 'Local de expedição' },
          WERKS: { type: 'string', description: 'Centro' },
          VORNR: { type: 'string', description: 'Nº da operação' },
          STEUS: { type: 'string', description: 'Chave de controle' }
        }
      },
      IMPTT: {
        type: 'object',
        properties: {
          POINT: { type: 'string', description: 'Ponto de medição' },
          EQUNR: { type: 'string', description: 'Instalação/Equipamento (FK EQUI)' },
          PTTXT: { type: 'string', description: 'Descrição do ponto de medição' },
          MSGRP: { type: 'string', description: 'Agrupador de medição (VIBR, TEMP, PRES, CORR)' },
          PTYP:  { type: 'string', description: 'Categoria de medição' },
          IWERK: { type: 'string', description: 'Centro' },
          QPUNT: { type: 'string', description: 'Unidade do valor de medição' },
          NKOUN: { type: 'string', description: 'Valor de medição (limite inferior)' },
          ENMNG: { type: 'number', description: 'Valor de medição lido' },
          MEINS: { type: 'string', description: 'Unidade de medida básica' },
          LDATE: { type: 'string', description: 'Data da última leitura (YYYYMMDD)' }
        }
      },
      MARA: {
        type: 'object',
        properties: {
          MATNR: { type: 'string', description: 'Nº do material' },
          MAKTX: { type: 'string', description: 'Texto breve do material' },
          MATL_TYPE: { type: 'string', description: 'Tipo de material (ERSA, HIBE)' },
          MEINS: { type: 'string', description: 'Unidade de medida básica (EA, KG, L, M, PC)' },
          MATKL: { type: 'string', description: 'Grupo de mercadorias' },
          MTPOS_MARA: { type: 'string', description: 'Grupo de categorias de item' },
          BRGEW: { type: 'number', description: 'Peso bruto' },
          NTGEW: { type: 'number', description: 'Peso líquido' },
          GEWEI: { type: 'string', description: 'Unidade de peso' }
        }
      },
      RESB: {
        type: 'object',
        properties: {
          RSNUM: { type: 'string', description: 'Nº da reserva' },
          AUFNR: { type: 'string', description: 'Nº da ordem associada (FK AUFK)' },
          MATNR: { type: 'string', description: 'Nº do material (FK MARA)' },
          BDMNG: { type: 'number', description: 'Quantidade necessária' },
          ENMNG: { type: 'number', description: 'Quantidade retirada (baixada)' },
          ERFMG: { type: 'number', description: 'Quantidade em unidade de registro' },
          MEINS: { type: 'string', description: 'Unidade de medida' },
          BDTER: { type: 'string', description: 'Data da necessidade (YYYYMMDD)' },
          LGORT: { type: 'string', description: 'Depósito' }
        }
      },
      MSEG: {
        type: 'object',
        properties: {
          MBLNR: { type: 'string', description: 'Nº do documento de material' },
          ZEILE: { type: 'string', description: 'Item do documento de material' },
          AUFNR: { type: 'string', description: 'Nº da ordem (FK AUFK)' },
          MATNR: { type: 'string', description: 'Nº do material (FK MARA)' },
          MENGE: { type: 'number', description: 'Quantidade' },
          MEINS: { type: 'string', description: 'Unidade de medida' },
          LGORT: { type: 'string', description: 'Depósito' },
          WERKS: { type: 'string', description: 'Centro' },
          BWART: { type: 'string', description: 'Tipo de movimento (261=saída, 262=estorno)' },
          BUDAT: { type: 'string', description: 'Data de lançamento no documento (YYYYMMDD)' }
        }
      }
    },
    parameters: {
      FilterParam: {
        in: 'query',
        name: '$filter',
        schema: { type: 'string' },
        description: 'Filtro OData (ex: EQUNR eq \'1234\')'
      },
      TopParam: {
        in: 'query',
        name: '$top',
        schema: { type: 'integer' },
        description: 'Número de registros a retornar (paginação)'
      },
      SkipParam: {
        in: 'query',
        name: '$skip',
        schema: { type: 'integer' },
        description: 'Número de registros a pular (paginação)'
      }
    }
  },
  paths: {
    // -------------------------------------------------------------------------
    // PM_EQUIPMENT_SRV
    // -------------------------------------------------------------------------
    '/PM_EQUIPMENT_SRV/EQUISet': {
      get: {
        tags: ['🔵 SAP ECC', 'PM_EQUIPMENT_SRV'],
        summary: 'Listar Equipamentos',
        description: 'Retorna a lista de equipamentos cadastrados na tabela EQUI.',
        parameters: [
          { $ref: '#/components/parameters/FilterParam' },
          { $ref: '#/components/parameters/TopParam' },
          { $ref: '#/components/parameters/SkipParam' }
        ],
        responses: {
          '200': { description: 'Lista de equipamentos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ODataListResponse' } } } },
          '500': { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      post: {
        tags: ['🔵 SAP ECC', 'PM_EQUIPMENT_SRV'],
        summary: 'Criar Equipamento',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/EQUI' } } }
        },
        responses: {
          '201': { description: 'Equipamento criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ODataSingleResponse' } } } },
          '400': { description: 'Erro de validação', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    "/PM_EQUIPMENT_SRV/EQUISet('{EQUNR}')": {
      get: {
        tags: ['🔵 SAP ECC', 'PM_EQUIPMENT_SRV'],
        summary: 'Obter Equipamento',
        parameters: [
          { in: 'path', name: 'EQUNR', required: true, schema: { type: 'string' }, description: 'ID do equipamento' }
        ],
        responses: {
          '200': { description: 'Equipamento encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ODataSingleResponse' } } } },
          '404': { description: 'Não encontrado' }
        }
      },
      put: {
        tags: ['🔵 SAP ECC', 'PM_EQUIPMENT_SRV'],
        summary: 'Atualizar Equipamento (Completo)',
        parameters: [
          { in: 'path', name: 'EQUNR', required: true, schema: { type: 'string' } }
        ],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/EQUI' } } } },
        responses: { '200': { description: 'Equipamento atualizado' }, '404': { description: 'Não encontrado' } }
      },
      patch: {
        tags: ['🔵 SAP ECC', 'PM_EQUIPMENT_SRV'],
        summary: 'Atualizar Equipamento (Parcial)',
        parameters: [
          { in: 'path', name: 'EQUNR', required: true, schema: { type: 'string' } }
        ],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/EQUI' } } } },
        responses: { '200': { description: 'Equipamento modificado' }, '404': { description: 'Não encontrado' } }
      },
      delete: {
        tags: ['🔵 SAP ECC', 'PM_EQUIPMENT_SRV'],
        summary: 'Deletar Equipamento',
        parameters: [
          { in: 'path', name: 'EQUNR', required: true, schema: { type: 'string' } }
        ],
        responses: { '204': { description: 'Equipamento deletado' }, '404': { description: 'Não encontrado' } }
      }
    },
    '/PM_FUNCLOC_SRV/IFLOTSet': {
      get: {
        tags: ['🔵 SAP ECC', 'PM_EQUIPMENT_SRV'],
        summary: 'Listar Locais de Instalação',
        parameters: [
          { $ref: '#/components/parameters/FilterParam' },
          { $ref: '#/components/parameters/TopParam' },
          { $ref: '#/components/parameters/SkipParam' }
        ],
        responses: { '200': { description: 'Sucesso' } }
      },
      post: {
        tags: ['🔵 SAP ECC', 'PM_EQUIPMENT_SRV'],
        summary: 'Criar Local de Instalação',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/IFLOT' } } } },
        responses: { '201': { description: 'Criado' } }
      }
    },
    "/PM_FUNCLOC_SRV/IFLOTSet('{TPLNR}')": {
      get: {
        tags: ['🔵 SAP ECC', 'PM_EQUIPMENT_SRV'],
        summary: 'Obter Local de Instalação',
        parameters: [{ in: 'path', name: 'TPLNR', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Encontrado' }, '404': { description: 'Não encontrado' } }
      },
      put: {
        tags: ['🔵 SAP ECC', 'PM_EQUIPMENT_SRV'],
        summary: 'Atualizar Local Instalação (Completo)',
        parameters: [{ in: 'path', name: 'TPLNR', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/IFLOT' } } } },
        responses: { '200': { description: 'Sucesso' }, '404': { description: 'Não encontrado' } }
      },
      patch: {
        tags: ['🔵 SAP ECC', 'PM_EQUIPMENT_SRV'],
        summary: 'Atualizar Local Instalação (Parcial)',
        parameters: [{ in: 'path', name: 'TPLNR', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/IFLOT' } } } },
        responses: { '200': { description: 'Sucesso' }, '404': { description: 'Não encontrado' } }
      },
      delete: {
        tags: ['🔵 SAP ECC', 'PM_EQUIPMENT_SRV'],
        summary: 'Deletar Local de Instalação',
        parameters: [{ in: 'path', name: 'TPLNR', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Sucesso' }, '404': { description: 'Não encontrado' } }
      }
    },

    // -------------------------------------------------------------------------
    // PM_NOTIFICATION_SRV
    // -------------------------------------------------------------------------
    '/PM_NOTIFICATION_SRV/QMELSet': {
      get: {
        tags: ['🔵 SAP ECC', 'PM_NOTIFICATION_SRV'],
        summary: 'Listar Notas de Manutenção',
        parameters: [
          { $ref: '#/components/parameters/FilterParam' },
          { $ref: '#/components/parameters/TopParam' },
          { $ref: '#/components/parameters/SkipParam' }
        ],
        responses: { '200': { description: 'Sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/ODataListResponse' } } } } }
      },
      post: {
        tags: ['🔵 SAP ECC', 'PM_NOTIFICATION_SRV'],
        summary: 'Criar Nota de Manutenção',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/QMEL' } } } },
        responses: { '201': { description: 'Criado' }, '400': { description: 'Erro validação' } }
      }
    },
    "/PM_NOTIFICATION_SRV/QMELSet('{QMNUM}')": {
      get: {
        tags: ['🔵 SAP ECC', 'PM_NOTIFICATION_SRV'],
        summary: 'Obter Nota de Manutenção',
        parameters: [{ in: 'path', name: 'QMNUM', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Encontrado' }, '404': { description: 'Não encontrado' } }
      },
      put: {
        tags: ['🔵 SAP ECC', 'PM_NOTIFICATION_SRV'],
        summary: 'Atualizar Nota (Completa)',
        parameters: [{ in: 'path', name: 'QMNUM', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/QMEL' } } } },
        responses: { '200': { description: 'Sucesso' }, '404': { description: 'Não encontrado' } }
      },
      patch: {
        tags: ['🔵 SAP ECC', 'PM_NOTIFICATION_SRV'],
        summary: 'Atualizar Nota (Parcial)',
        parameters: [{ in: 'path', name: 'QMNUM', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/QMEL' } } } },
        responses: { '200': { description: 'Sucesso' }, '404': { description: 'Não encontrado' } }
      },
      delete: {
        tags: ['🔵 SAP ECC', 'PM_NOTIFICATION_SRV'],
        summary: 'Deletar Nota de Manutenção',
        parameters: [{ in: 'path', name: 'QMNUM', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Sucesso' }, '404': { description: 'Não encontrado' } }
      }
    },

    // -------------------------------------------------------------------------
    // PM_ORDER_SRV
    // -------------------------------------------------------------------------
    '/PM_ORDER_SRV/AUFKSet': {
      get: {
        tags: ['🔵 SAP ECC', 'PM_ORDER_SRV'],
        summary: 'Listar Ordens de Manutenção',
        parameters: [
          { $ref: '#/components/parameters/FilterParam' },
          { $ref: '#/components/parameters/TopParam' },
          { $ref: '#/components/parameters/SkipParam' }
        ],
        responses: { '200': { description: 'Sucesso', content: { 'application/json': { schema: { $ref: '#/components/schemas/ODataListResponse' } } } } }
      },
      post: {
        tags: ['🔵 SAP ECC', 'PM_ORDER_SRV'],
        summary: 'Criar Ordem de Manutenção',
        description: 'Cria uma Ordem na AUFK e seus dados operacionais vinculados na tabela AFKO.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AUFK' } } } },
        responses: { '201': { description: 'Criada' }, '400': { description: 'Erro validação' } }
      }
    },
    "/PM_ORDER_SRV/AUFKSet('{AUFNR}')": {
      get: {
        tags: ['🔵 SAP ECC', 'PM_ORDER_SRV'],
        summary: 'Obter Ordem de Manutenção',
        parameters: [{ in: 'path', name: 'AUFNR', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Encontrada' }, '404': { description: 'Não encontrada' } }
      },
      put: {
        tags: ['🔵 SAP ECC', 'PM_ORDER_SRV'],
        summary: 'Atualizar Ordem (Completa)',
        parameters: [{ in: 'path', name: 'AUFNR', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/AUFK' } } } },
        responses: { '200': { description: 'Sucesso' }, '404': { description: 'Não encontrada' } }
      },
      patch: {
        tags: ['🔵 SAP ECC', 'PM_ORDER_SRV'],
        summary: 'Atualizar Ordem (Parcial)',
        parameters: [{ in: 'path', name: 'AUFNR', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/AUFK' } } } },
        responses: { '200': { description: 'Sucesso' }, '404': { description: 'Não encontrada' } }
      },
      delete: {
        tags: ['🔵 SAP ECC', 'PM_ORDER_SRV'],
        summary: 'Deletar Ordem de Manutenção',
        description: 'Exclui da tabela AUFK e AFKO (cascata).',
        parameters: [{ in: 'path', name: 'AUFNR', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Sucesso' }, '404': { description: 'Não encontrada' } }
      }
    },

    // -------------------------------------------------------------------------
    // PM_MAINTPLAN_SRV 
    // -------------------------------------------------------------------------
    '/PM_MAINTPLAN_SRV/MMPTSet': {
      get: {
        tags: ['🔵 SAP ECC', 'PM_MAINTPLAN_SRV'],
        summary: 'Listar Planos de Manutenção Preventiva',
        parameters: [
          { $ref: '#/components/parameters/FilterParam' },
          { $ref: '#/components/parameters/TopParam' },
          { $ref: '#/components/parameters/SkipParam' }
        ],
        responses: { '200': { description: 'Sucesso' } }
      },
      post: {
        tags: ['🔵 SAP ECC', 'PM_MAINTPLAN_SRV'],
        summary: 'Criar Plano Preventivo',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MMPT_PLPO' } } } },
        responses: { '201': { description: 'Criado' } }
      }
    },
    "/PM_MAINTPLAN_SRV/MMPTSet('{WARPL}')": {
      get: {
        tags: ['🔵 SAP ECC', 'PM_MAINTPLAN_SRV'],
        summary: 'Obter Plano de Manutenção',
        parameters: [{ in: 'path', name: 'WARPL', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Encontrado' } }
      },
      put: {
        tags: ['🔵 SAP ECC', 'PM_MAINTPLAN_SRV'],
        summary: 'Atualizar Plano (Completo)',
        parameters: [{ in: 'path', name: 'WARPL', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MMPT_PLPO' } } } },
        responses: { '200': { description: 'Sucesso' } }
      },
      patch: {
        tags: ['🔵 SAP ECC', 'PM_MAINTPLAN_SRV'],
        summary: 'Atualizar Plano (Parcial)',
        parameters: [{ in: 'path', name: 'WARPL', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MMPT_PLPO' } } } },
        responses: { '200': { description: 'Sucesso' } }
      },
      delete: {
        tags: ['🔵 SAP ECC', 'PM_MAINTPLAN_SRV'],
        summary: 'Deletar Plano e Tarefas',
        parameters: [{ in: 'path', name: 'WARPL', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Sucesso' } }
      }
    },

    '/PM_MAINTPLAN_SRV/PLPOSet': {
      get: {
        tags: ['🔵 SAP ECC', 'PM_MAINTPLAN_SRV'],
        summary: 'Listar Tarefas (Roteiro)',
        description: 'Exige um filtro $filter=WARPL eq \'X\'.',
        parameters: [{ $ref: '#/components/parameters/FilterParam' }],
        responses: { '200': { description: 'Sucesso' } }
      },
      post: {
        tags: ['🔵 SAP ECC', 'PM_MAINTPLAN_SRV'],
        summary: 'Adicionar Tarefa ao Roteiro do Plano',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PLPO' } } } },
        responses: { '201': { description: 'Criada' } }
      }
    },
    "/PM_MAINTPLAN_SRV/PLPOSet('{PLNNR}')": {
      delete: {
        tags: ['🔵 SAP ECC', 'PM_MAINTPLAN_SRV'],
        summary: 'Remover Tarefa do Roteiro',
        parameters: [{ in: 'path', name: 'PLNNR', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Sucesso' } }
      }
    },

    // -------------------------------------------------------------------------
    // PM_MEASPOINT_SRV
    // -------------------------------------------------------------------------
    '/PM_MEASPOINT_SRV/IMPTTSet': {
      get: {
        tags: ['🔵 SAP ECC', 'PM_MEASPOINT_SRV'],
        summary: 'Listar Pontos de Medição',
        parameters: [
          { $ref: '#/components/parameters/FilterParam' },
          { $ref: '#/components/parameters/TopParam' },
          { $ref: '#/components/parameters/SkipParam' }
        ],
        responses: { '200': { description: 'Sucesso' } }
      },
      post: {
        tags: ['🔵 SAP ECC', 'PM_MEASPOINT_SRV'],
        summary: 'Criar Ponto de Medição',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/IMPTT' } } } },
        responses: { '201': { description: 'Criado' } }
      }
    },
    "/PM_MEASPOINT_SRV/IMPTTSet('{POINT}')": {
      get: {
        tags: ['🔵 SAP ECC', 'PM_MEASPOINT_SRV'],
        summary: 'Obter Ponto de Medição',
        parameters: [{ in: 'path', name: 'POINT', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Encontrado' } }
      },
      patch: {
        tags: ['🔵 SAP ECC', 'PM_MEASPOINT_SRV'],
        summary: 'Registrar Leitura (Patch Ponto)',
        parameters: [{ in: 'path', name: 'POINT', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/IMPTT' } } } },
        responses: { '200': { description: 'Sucesso' }, '400': { description: 'Erro validação' } }
      },
      delete: {
        tags: ['🔵 SAP ECC', 'PM_MEASPOINT_SRV'],
        summary: 'Deletar Ponto de Medição',
        parameters: [{ in: 'path', name: 'POINT', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Sucesso' } }
      }
    },

    // -------------------------------------------------------------------------
    // PM_MATERIAL_SRV
    // -------------------------------------------------------------------------
    '/PM_MATERIAL_SRV/MARASet': {
      get: {
        tags: ['🔵 SAP ECC', 'PM_MATERIAL_SRV'],
        summary: 'Listar Materiais/Peças',
        parameters: [
          { $ref: '#/components/parameters/FilterParam' },
          { $ref: '#/components/parameters/TopParam' },
          { $ref: '#/components/parameters/SkipParam' }
        ],
        responses: { '200': { description: 'Sucesso' } }
      },
      post: {
        tags: ['🔵 SAP ECC', 'PM_MATERIAL_SRV'],
        summary: 'Criar Material de Reposição',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MARA' } } } },
        responses: { '201': { description: 'Criado' } }
      }
    },
    "/PM_MATERIAL_SRV/MARASet('{MATNR}')": {
      get: {
        tags: ['🔵 SAP ECC', 'PM_MATERIAL_SRV'],
        summary: 'Obter Material',
        parameters: [{ in: 'path', name: 'MATNR', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Encontrado' } }
      },
      put: {
        tags: ['🔵 SAP ECC', 'PM_MATERIAL_SRV'],
        summary: 'Atualizar Material (Completo)',
        parameters: [{ in: 'path', name: 'MATNR', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MARA' } } } },
        responses: { '200': { description: 'Sucesso' } }
      },
      patch: {
        tags: ['🔵 SAP ECC', 'PM_MATERIAL_SRV'],
        summary: 'Atualizar Material (Parcial)',
        parameters: [{ in: 'path', name: 'MATNR', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MARA' } } } },
        responses: { '200': { description: 'Sucesso' } }
      },
      delete: {
        tags: ['🔵 SAP ECC', 'PM_MATERIAL_SRV'],
        summary: 'Deletar Material',
        parameters: [{ in: 'path', name: 'MATNR', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Sucesso' } }
      }
    },

    '/PM_MATERIAL_SRV/RESBSet': {
      get: {
        tags: ['🔵 SAP ECC', 'PM_MATERIAL_SRV'],
        summary: 'Listar Reservas de Material',
        parameters: [
          { $ref: '#/components/parameters/FilterParam' },
          { $ref: '#/components/parameters/TopParam' },
          { $ref: '#/components/parameters/SkipParam' }
        ],
        responses: { '200': { description: 'Sucesso' } }
      },
      post: {
        tags: ['🔵 SAP ECC', 'PM_MATERIAL_SRV'],
        summary: 'Criar Reserva em Ordem',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RESB' } } } },
        responses: { '201': { description: 'Criada' } }
      }
    },
    "/PM_MATERIAL_SRV/RESBSet('{RSNUM}')": {
      get: {
        tags: ['🔵 SAP ECC', 'PM_MATERIAL_SRV'],
        summary: 'Obter Reserva',
        parameters: [{ in: 'path', name: 'RSNUM', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Encontrada' } }
      },
      patch: {
        tags: ['🔵 SAP ECC', 'PM_MATERIAL_SRV'],
        summary: 'Atualizar Reserva (Parcial)',
        parameters: [{ in: 'path', name: 'RSNUM', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/RESB' } } } },
        responses: { '200': { description: 'Sucesso' } }
      },
      delete: {
        tags: ['🔵 SAP ECC', 'PM_MATERIAL_SRV'],
        summary: 'Deletar Reserva',
        parameters: [{ in: 'path', name: 'RSNUM', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Sucesso' } }
      }
    },

    '/PM_MATERIAL_SRV/MSEGSet': {
      get: {
        tags: ['🔵 SAP ECC', 'PM_MATERIAL_SRV'],
        summary: 'Listar Movimentações de Material',
        parameters: [
          { $ref: '#/components/parameters/FilterParam' },
          { $ref: '#/components/parameters/TopParam' },
          { $ref: '#/components/parameters/SkipParam' }
        ],
        responses: { '200': { description: 'Sucesso' } }
      },
      post: {
        tags: ['🔵 SAP ECC', 'PM_MATERIAL_SRV'],
        summary: 'Registrar Movimentação (Saída/Estorno)',
        description: 'Registra movimentação e atualiza as reservas consumidas (RESB) via BWART (261=Saída).',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MSEG' } } } },
        responses: { '201': { description: 'Criado' } }
      }
    },
    "/PM_MATERIAL_SRV/MSEGSet('{MBLNR}')": {
      get: {
        tags: ['🔵 SAP ECC', 'PM_MATERIAL_SRV'],
        summary: 'Obter Movimentação MBLNR',
        parameters: [{ in: 'path', name: 'MBLNR', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Encontrado' } }
      },
      delete: {
        tags: ['🔵 SAP ECC', 'PM_MATERIAL_SRV'],
        summary: 'Deletar Registro de Movimentação MBLNR',
        parameters: [{ in: 'path', name: 'MBLNR', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Sucesso' } }
      }
    },

    // -------------------------------------------------------------------------
    // PM_ANALYTICS_SRV
    // -------------------------------------------------------------------------
    "/PM_ANALYTICS_SRV/EquipmentHistory('{EQUNR}')": {
      get: {
        tags: ['🔵 SAP ECC', 'PM_ANALYTICS_SRV'],
        summary: 'Histórico Completo do Equipamento EQUNR',
        description: 'Retorna todas as notas, ordens, medições e movimentos do equipamento.',
        parameters: [{ in: 'path', name: 'EQUNR', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Sucesso' } }
      }
    },
    '/PM_ANALYTICS_SRV/OpenNotifications': {
      get: {
        tags: ['🔵 SAP ECC', 'PM_ANALYTICS_SRV'],
        summary: 'Notas de Manutenção Abertas (Organizadas por Prioridade)',
        responses: { '200': { description: 'Sucesso' } }
      }
    },
    '/PM_ANALYTICS_SRV/OrderBacklog': {
      get: {
        tags: ['🔵 SAP ECC', 'PM_ANALYTICS_SRV'],
        summary: 'Backlog de Ordens Pendentes',
        description: 'Ordens que estão nos status CRTD (Criadas) e REL (Liberadas).',
        responses: { '200': { description: 'Sucesso' } }
      }
    },
    "/PM_ANALYTICS_SRV/EquipmentMTBF('{EQUNR}')": {
      get: {
        tags: ['🔵 SAP ECC', 'PM_ANALYTICS_SRV'],
        summary: 'Consultar MTBF (Mean Time Between Failures)',
        description: 'Tempo médio entre as notas de avaria do tipo M1.',
        parameters: [{ in: 'path', name: 'EQUNR', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Sucesso' } }
      }
    },
    "/PM_ANALYTICS_SRV/EquipmentMTTR('{EQUNR}')": {
      get: {
        tags: ['🔵 SAP ECC', 'PM_ANALYTICS_SRV'],
        summary: 'Consultar MTTR (Mean Time To Repair)',
        description: 'Tempo médio de resolução do momento da abertura à conclusão de notas da manutenção.',
        parameters: [{ in: 'path', name: 'EQUNR', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Sucesso' } }
      }
    },
    '/PM_ANALYTICS_SRV/CriticalEquipment': {
      get: {
        tags: ['🔵 SAP ECC', 'PM_ANALYTICS_SRV'],
        summary: 'Painel 10 Equipamentos mais Críticos',
        description: 'Fórmula estatística simples para quantificar ordens pendentes, paradas reportadas e dinheiro empenhado em reposições no armazém.',
        responses: { '200': { description: 'Sucesso' } }
      }
    },
    '/PM_ANALYTICS_SRV/MaintenanceCostByEquipment': {
      get: {
        tags: ['🔵 SAP ECC', 'PM_ANALYTICS_SRV'],
        summary: 'Agrupar Custos Indiretos Por Equipamento',
        description: 'Volume das saídas de materiais de consumo MSEG referenciando manutenções alinhadas a cada ativo produtivo catalogado da planta.',
        responses: { '200': { description: 'Sucesso' } }
      }
    },
    '/PM_ANALYTICS_SRV/PreventiveCompliance': {
      get: {
        tags: ['🔵 SAP ECC', 'PM_ANALYTICS_SRV'],
        summary: 'Auditoria: Eficácia do Plano Preventivo/Predictivo',
        description: 'Comparações de NPLDA com ERDAT que resultam em detecção de CRITICAL OVERDUE das revisões fixadas da integridade estrutural e componentes mecânicos.',
        responses: { '200': { description: 'Sucesso' } }
      }
    }
  }
};

module.exports = swaggerSpec;
