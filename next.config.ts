import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Padrão do Next é 1MB por requisição de Server Action — baixo demais pros nossos
      // uploads (planilha de portfólio até 25MB, foto até 10MB etc), que viajam como string
      // base64 (~33% maior que o arquivo original). Sem isso, upload de arquivo acima de
      // ~750KB falha silenciosamente (a requisição é rejeitada antes de chegar no código).
      bodySizeLimit: "40mb",
    },
  },
};

export default nextConfig;
