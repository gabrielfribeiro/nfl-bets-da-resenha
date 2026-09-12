# 🏈 NFL Bets da Resenha

Um gerenciador dinâmico, moderno e competitivo para bolões e apostas entre amigos na NFL, com acompanhamento de bancas, sincronização de rodadas e placares em tempo real via ESPN!

---

## ✨ Funcionalidades Principais

- **🏈 Central de Jogos NFL (ESPN em Tempo Real):**
  - Acompanhe placares ao vivo, quarto atual, cronômetro e canais de transmissão de cada partida.
  - Filtro exclusivo para os jogos envolvendo os times do bolão.
  - Liquidação direta de apostas (Green / Red) no próprio card da partida.
- **💰 Gestão de Potes e Bancas:**
  - Cada time participante inicia com sua banca base.
  - Cálculo automático de lucros com base nas odds personalizadas.
- **⚡ Cartas de Power-Up:**
  - `🛡️ Escudo Anti-Zebra`: protege a banca em caso de Red.
  - `⚡ Turbo Lucro 2X`: dobra o lucro se a aposta bater.
  - Criador e gerenciador de power-ups customizados nas configurações.
- **🏆 Classificação & Gráficos:**
  - Leaderboard detalhado com ranking, saldo, greens/reds e ROI.
  - Gráfico interativo de evolução dos potes ao longo das semanas.
- **📸 Resenha da Rodada (Compartilhamento):**
  - Exportação em imagem de alta resolução (PNG) pronta para o WhatsApp ou Instagram Stories.
  - Cópia rápida de resumo em texto formatado para grupos.
- **💾 Backup & Sincronização:**
  - Exportação e importação de dados em JSON.
  - Sincronização automática com o calendário oficial da NFL.

---

## 🚀 Como Rodar Localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/gabrielfribeiro/nfl-bets-da-resenha.git
   cd nfl-bets-da-resenha
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Build para Produção:**
   ```bash
   npm run build
   ```

---

## 🛠️ Tecnologias Utilizadas

- **React 19** + **Vite**
- **Tailwind CSS**
- **ESPN Public API**
- **html-to-image** & **canvas-confetti**

