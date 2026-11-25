-- Cultura (ou criação) a que cada registro se refere: milho, soja, feijão, gado.
-- Fica em destaque no cartão do diário. Vem da fala ("fungicida no feijão") ou, se não foi dita,
-- da cultura cadastrada no talhão. Guardada no registro porque o talhão muda de cultura a cada
-- safra, e o registro antigo tem que continuar dizendo a cultura daquela época.

alter table activities
  add column if not exists crop text
  check (crop is null or char_length(crop) <= 100);

-- Registros que já existem: a cultura atual do talhão é o melhor palpite.
update activities a
set crop = lower(f.crop)
from fields f
where a.field_id = f.id
  and a.crop is null
  and f.crop is not null
  and btrim(f.crop) <> '';

-- Registros com o talhão gravado como "null" ou "/null" pela extração: fica sem talhão.
update activities
set field_name = null
where field_id is null
  and lower(regexp_replace(coalesce(field_name, ''), '[^a-zA-Z]', '', 'g')) in ('null', 'undefined', 'none');
