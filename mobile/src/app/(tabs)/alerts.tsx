import { Paragrafo, Tela, Titulo } from '../../components/ui/Tela';

// Os alertas de carência dependem do catálogo de produtos (etapa 3).
export default function AlertsScreen() {
  return (
    <Tela>
      <Titulo>Alertas</Titulo>
      <Paragrafo>
        Aqui vão aparecer os avisos de carência dos defensivos, para você saber quando já pode
        colher. Essa parte ainda está em construção.
      </Paragrafo>
    </Tela>
  );
}
