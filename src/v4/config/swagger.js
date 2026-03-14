const swaggerSpecV4 = {
  tags: [
    { name: '🟢 SAP S/4HANA - Equipment', description: 'Endpoints de Equipamentos da camada S/4HANA' },
    { name: '🟢 SAP S/4HANA - Functional Location', description: 'Endpoints de Locais de Instalação da camada S/4HANA' },
    { name: '🟢 SAP S/4HANA - Notifications', description: 'Endpoints de Notas de Manutenção da camada S/4HANA' },
    { name: '🟢 SAP S/4HANA - Orders', description: 'Endpoints de Ordens de Manutenção da camada S/4HANA' },
    { name: '🟢 SAP S/4HANA - Maintenance Plans', description: 'Endpoints de Planos de Manutenção da camada S/4HANA' },
    { name: '🟢 SAP S/4HANA - Analytics', description: 'Endpoints Analíticos da camada S/4HANA' },
  ],
  paths: {
    // -------------------------------------------------------------------------
    // EQUIPMENT
    // -------------------------------------------------------------------------
    '/API_EQUIPMENT/EquipmentCollection': {
      get: {
        tags: ['🟢 SAP S/4HANA - Equipment'],
        summary: 'Lista Equipamentos (S/4HANA)',
        description: 'Retorna a coleção de Equipamentos',
        responses: { 200: { description: 'Sucesso' } }
      },
      post: {
        tags: ['🟢 SAP S/4HANA - Equipment'],
        summary: 'Cria um Equipamento (S/4HANA)',
        parameters: [{ name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  EquipmentName: { type: 'string', example: 'Motor Trifásico' },
                  EquipmentCategory: { type: 'string', example: 'M' },
                  TechnicalObjectType: { type: 'string', example: 'MOT' },
                  GrossWeight: { type: 'number', example: 15.5 },
                  WeightUnit: { type: 'string', example: 'KG' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Criado com sucesso' }, 400: { description: 'Erro de validação' } }
      }
    },
    '/API_EQUIPMENT/EquipmentCollection(\'{id}\')': {
      get: {
        tags: ['🟢 SAP S/4HANA - Equipment'],
        summary: 'Obtém um Equipamento Específico',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Sucesso' }, 404: { description: 'Não encontrado' } }
      },
      patch: {
        tags: ['🟢 SAP S/4HANA - Equipment'],
        summary: 'Atualiza parcialmente um Equipamento',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  EquipmentName: { type: 'string', example: 'Motor Trifásico - Atualizado' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Atualizado com sucesso' }, 404: { description: 'Não encontrado' } }
      },
      delete: {
        tags: ['🟢 SAP S/4HANA - Equipment'],
        summary: 'Deleta um Equipamento (S/4HANA)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }
        ],
        responses: { 204: { description: 'Deletado com sucesso' }, 404: { description: 'Não encontrado' } }
      }
    },
    '/API_EQUIPMENT/EquipmentCollection(\'{id}\')/to_MeasuringPoint': {
      get: {
        tags: ['🟢 SAP S/4HANA - Equipment'],
        summary: 'Navegação: Obter Pontos de Medição do Equipamento',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Sucesso' } }
      }
    },

    // -------------------------------------------------------------------------
    // FUNCTIONAL LOCATION
    // -------------------------------------------------------------------------
    '/API_FUNCTIONALLOCATION/FunctionalLocationCollection': {
      get: {
        tags: ['🟢 SAP S/4HANA - Functional Location'],
        summary: 'Lista Locais de Instalação (S/4HANA)',
        responses: { 200: { description: 'Sucesso' } }
      },
      post: {
        tags: ['🟢 SAP S/4HANA - Functional Location'],
        summary: 'Cria Local de Instalação (S/4HANA)',
        parameters: [{ name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  FunctionalLocationName: { type: 'string', example: 'Área de Produção' },
                  FunctionalLocationCategory: { type: 'string', example: 'M' },
                  PlantSection: { type: 'string', example: 'A1' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Criado com sucesso' }, 400: { description: 'Erro' } }
      }
    },
    '/API_FUNCTIONALLOCATION/FunctionalLocationCollection(\'{id}\')': {
      get: {
        tags: ['🟢 SAP S/4HANA - Functional Location'],
        summary: 'Obtém um Local de Instalação',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Sucesso' }, 404: { description: 'Não encontrado' } }
      },
      patch: {
        tags: ['🟢 SAP S/4HANA - Functional Location'],
        summary: 'Atualiza parcialmente um Local de Instalação',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  FunctionalLocationName: { type: 'string', example: 'Área de Produção - Atualizado' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Atualizado' }, 404: { description: 'Não encontrado' } }
      },
      delete: {
        tags: ['🟢 SAP S/4HANA - Functional Location'],
        summary: 'Deleta um Local de Instalação',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }
        ],
        responses: { 204: { description: 'Deletado' }, 404: { description: 'Não encontrado' } }
      }
    },

    // -------------------------------------------------------------------------
    // NOTIFICATIONS
    // -------------------------------------------------------------------------
    '/API_MAINTNOTIFICATION/MaintenanceNotificationCollection': {
      get: {
        tags: ['🟢 SAP S/4HANA - Notifications'],
        summary: 'Lista Notas de Manutenção (S/4HANA)',
        description: 'Retorna a coleção de Notas de Manutenção com suporte a $filter, $top e $skip.',
        responses: { 200: { description: 'Sucesso' } }
      },
      post: {
        tags: ['🟢 SAP S/4HANA - Notifications'],
        summary: 'Cria uma Nota de Manutenção (S/4HANA)',
        description: 'Cria uma nota. Requer: NotificationText, NotificationType, TechnicalObject. ID é gerado automaticamente.',
        parameters: [{ name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  NotificationText: { type: 'string', example: 'Motor falhando' },
                  NotificationType: { type: 'string', example: 'M1' },
                  TechnicalObject: { type: 'string', example: 'EQ-00001' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Criado com sucesso' }, 400: { description: 'Erro de validação (ex: Equipamento não encontrado)' } }
      }
    },
    '/API_MAINTNOTIFICATION/MaintenanceNotificationCollection(\'{id}\')': {
      get: {
        tags: ['🟢 SAP S/4HANA - Notifications'],
        summary: 'Obtém uma Nota de Manutenção Específica',
        description: 'Retorna detalhes da nota pelo ID.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Sucesso' }, 404: { description: 'Nota não encontrada' } }
      },
      patch: {
        tags: ['🟢 SAP S/4HANA - Notifications'],
        summary: 'Atualiza parcialmente uma Nota de Manutenção',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  NotificationText: { type: 'string', example: 'Motor falhando - Atualizado' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Atualizado com sucesso' }, 404: { description: 'Nota não encontrada' } }
      }
    },
    '/API_MAINTNOTIFICATION/MaintenanceNotificationCollection(\'{id}\')/to_MaintenanceOrder': {
      get: {
        tags: ['🟢 SAP S/4HANA - Notifications'],
        summary: 'Navegação: Obter Ordens da Nota',
        description: 'Retorna todas as ordens de manutenção associadas a esta nota.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Sucesso' } }
      }
    },
    '/API_MAINTNOTIFICATION/SetToInProcess': {
      post: {
        tags: ['🟢 SAP S/4HANA - Notifications'],
        summary: 'Ação: Setar para "Em Processamento"',
        description: 'Altera a fase da nota de Manutenção para "2" (Em Processamento).',
        parameters: [{ name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { MaintenanceNotification: { type: 'string', example: 'NF-20231015-0001' } }
              }
            }
          }
        },
        responses: { 200: { description: 'Sucesso' }, 400: { description: 'Transição de Estado Inválida' } }
      }
    },
    '/API_MAINTNOTIFICATION/Complete': {
      post: {
        tags: ['🟢 SAP S/4HANA - Notifications'],
        summary: 'Ação: Concluir',
        description: 'Altera a fase da nota de Manutenção para "3" (Concluída) e define a data final da falha.',
        parameters: [{ name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { MaintenanceNotification: { type: 'string', example: 'NF-20231015-0001' } }
              }
            }
          }
        },
        responses: { 200: { description: 'Sucesso' }, 400: { description: 'Transição de Estado Inválida' } }
      }
    },
    '/API_MAINTNOTIFICATION/Postpone': {
      post: {
        tags: ['🟢 SAP S/4HANA - Notifications'],
        summary: 'Ação: Adiar',
        description: 'Altera a fase da nota de Manutenção para "4" (Adiada).',
        parameters: [{ name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { MaintenanceNotification: { type: 'string', example: 'NF-20231015-0001' } }
              }
            }
          }
        },
        responses: { 200: { description: 'Sucesso' }, 400: { description: 'Transição de Estado Inválida' } }
      }
    },

    // -------------------------------------------------------------------------
    // ORDERS
    // -------------------------------------------------------------------------
    '/API_MAINTENANCEORDER/MaintenanceOrderCollection': {
      get: {
        tags: ['🟢 SAP S/4HANA - Orders'],
        summary: 'Lista Ordens de Manutenção (S/4HANA)',
        responses: { 200: { description: 'Sucesso' } }
      },
      post: {
        tags: ['🟢 SAP S/4HANA - Orders'],
        summary: 'Cria Ordem de Manutenção (S/4HANA)',
        parameters: [{ name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  MaintenanceOrderType: { type: 'string', example: 'PM01' },
                  MaintenanceOrderDesc: { type: 'string', example: 'Reparo bomba de água' },
                  Equipment: { type: 'string', example: 'EQ-00001' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Criado com sucesso' }, 400: { description: 'Erro' } }
      }
    },
    '/API_MAINTENANCEORDER/MaintenanceOrderCollection(\'{id}\')': {
      get: {
        tags: ['🟢 SAP S/4HANA - Orders'],
        summary: 'Obtém Ordem de Manutenção Específica',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Sucesso' }, 404: { description: 'Não encontrado' } }
      }
    },

    // -------------------------------------------------------------------------
    // MAINTENANCE PLANS
    // -------------------------------------------------------------------------
    '/API_MAINTPLAN/MaintenancePlanCollection': {
      get: {
        tags: ['🟢 SAP S/4HANA - Maintenance Plans'],
        summary: 'Lista Planos de Manutenção (S/4HANA)',
        responses: { 200: { description: 'Sucesso' } }
      },
      post: {
        tags: ['🟢 SAP S/4HANA - Maintenance Plans'],
        summary: 'Cria Plano de Manutenção (S/4HANA)',
        parameters: [{ name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  MaintenancePlanDesc: { type: 'string', example: 'Plano mensal preventivo' },
                  MaintPlanCategory: { type: 'string', example: 'PM' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Criado com sucesso' }, 400: { description: 'Erro' } }
      }
    },
    '/API_MAINTPLAN/MaintenancePlanCollection(\'{id}\')': {
      get: {
        tags: ['🟢 SAP S/4HANA - Maintenance Plans'],
        summary: 'Obtém Plano de Manutenção (S/4HANA)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Sucesso' }, 404: { description: 'Não encontrado' } }
      },
      patch: {
        tags: ['🟢 SAP S/4HANA - Maintenance Plans'],
        summary: 'Atualiza Plano de Manutenção',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  MaintenancePlanDesc: { type: 'string', example: 'Plano mensal - Atualizado' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Atualizado com sucesso' }, 404: { description: 'Não encontrado' } }
      }
    },
    '/API_MAINTPLAN/MaintenancePlanCollection(\'{id}\')/to_MaintenancePlanItem': {
      get: {
        tags: ['🟢 SAP S/4HANA - Maintenance Plans'],
        summary: 'Navegação: Obter Itens do Plano',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Sucesso' } }
      },
      post: {
        tags: ['🟢 SAP S/4HANA - Maintenance Plans'],
        summary: 'Cria Item no Plano (S/4HANA)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  MaintenanceItemDesc: { type: 'string', example: 'Item 1' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Criado com sucesso' }, 400: { description: 'Erro' } }
      }
    },
    '/API_MAINTPLAN/StartMaintPlnSchedule': {
      post: {
        tags: ['🟢 SAP S/4HANA - Maintenance Plans'],
        summary: 'Ação: Iniciar Agendamento do Plano',
        parameters: [{ name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { MaintenancePlan: { type: 'string', example: 'PL-00001' } }
              }
            }
          }
        },
        responses: { 200: { description: 'Sucesso' } }
      }
    },
    '/API_MAINTPLAN/RestartMaintPlnSchedule': {
      post: {
        tags: ['🟢 SAP S/4HANA - Maintenance Plans'],
        summary: 'Ação: Reiniciar Agendamento do Plano',
        parameters: [{ name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { MaintenancePlan: { type: 'string', example: 'PL-00001' } }
              }
            }
          }
        },
        responses: { 200: { description: 'Sucesso' } }
      }
    },

    // -------------------------------------------------------------------------
    // ANALYTICS
    // -------------------------------------------------------------------------
    '/PM_S4_ANALYTICS_SRV/EquipmentAvailability': {
      get: {
        tags: ['🟢 SAP S/4HANA - Analytics'],
        summary: 'Analítico: Disponibilidade de Equipamentos',
        responses: { 200: { description: 'Sucesso' } }
      }
    },
    '/PM_S4_ANALYTICS_SRV/NotificationsByPhase': {
      get: {
        tags: ['🟢 SAP S/4HANA - Analytics'],
        summary: 'Analítico: Notas de Manutenção por Fase',
        responses: { 200: { description: 'Sucesso' } }
      }
    },
    '/PM_S4_ANALYTICS_SRV/OrdersByPhase': {
      get: {
        tags: ['🟢 SAP S/4HANA - Analytics'],
        summary: 'Analítico: Ordens de Manutenção por Fase',
        responses: { 200: { description: 'Sucesso' } }
      }
    },
    '/PM_S4_ANALYTICS_SRV/MaintenancePlanCompliance': {
      get: {
        tags: ['🟢 SAP S/4HANA - Analytics'],
        summary: 'Analítico: Conformidade dos Planos de Manutenção',
        responses: { 200: { description: 'Sucesso' } }
      }
    },
    '/PM_S4_ANALYTICS_SRV/CriticalEquipment': {
      get: {
        tags: ['🟢 SAP S/4HANA - Analytics'],
        summary: 'Analítico: Equipamentos Críticos',
        responses: { 200: { description: 'Sucesso' } }
      }
    },
    '/PM_S4_ANALYTICS_SRV/NotificationTrend': {
      get: {
        tags: ['🟢 SAP S/4HANA - Analytics'],
        summary: 'Analítico: Tendência de Notas',
        responses: { 200: { description: 'Sucesso' } }
      }
    },
    '/PM_S4_ANALYTICS_SRV/OrderCostSummary': {
      get: {
        tags: ['🟢 SAP S/4HANA - Analytics'],
        summary: 'Analítico: Resumo de Custos de Ordens',
        responses: { 200: { description: 'Sucesso' } }
      }
    },
    '/PM_S4_ANALYTICS_SRV/PlantMaintenanceSummary': {
      get: {
        tags: ['🟢 SAP S/4HANA - Analytics'],
        summary: 'Analítico: Resumo de Manutenção da Planta',
        responses: { 200: { description: 'Sucesso' } }
      }
    }
  }
};

module.exports = swaggerSpecV4;
