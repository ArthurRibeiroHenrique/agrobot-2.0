export function validarAtividade(atividade) { 
  const erros = []; 
  if (atividade.activity_type == null) erros.push('activity_type obrigatorio'); 
  if (atividade.product == null) erros.push('product obrigatorio'); 
  return erros; 
} 
