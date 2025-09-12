
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Code,
  Server,
  Zap
} from "lucide-react";

const Email = () => {
  return (
    <div className="p-8 space-y-8">
        <PageHeader
          title="Sistema de E-mail"
          description="Sistema de comunicação em desenvolvimento - funcionalidades avançadas em breve"
        />

        {/* Development Status */}
        <Card className="card-elevated border-warning/20 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Status de Desenvolvimento
            </CardTitle>
            <CardDescription>
              Este sistema está sendo desenvolvido como último da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="font-medium">Planejamento e Arquitetura</span>
                </div>
                <Badge className="bg-success/10 text-success">Concluído</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  <span className="font-medium">Desenvolvimento Backend</span>
                </div>
                <Badge className="bg-warning/10 text-warning">Em Progresso</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Interface do Usuário</span>
                </div>
                <Badge variant="outline">Pendente</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Integração e Testes</span>
                </div>
                <Badge variant="outline">Pendente</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Planned Features */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Funcionalidades Planejadas
              </CardTitle>
              <CardDescription>
                Recursos que serão implementados no sistema de e-mail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="font-semibold">Envio de E-mails Transacionais</h4>
                    <p className="text-sm text-muted-foreground">
                      Confirmações, notificações e alertas automáticos
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="font-semibold">Templates Personalizáveis</h4>
                    <p className="text-sm text-muted-foreground">
                      Editor visual para criar e personalizar layouts
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="font-semibold">Campanhas de Marketing</h4>
                    <p className="text-sm text-muted-foreground">
                      Envios em massa com segmentação avançada
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                  <div>
                    <h4 className="font-semibold">Analytics Detalhado</h4>
                    <p className="text-sm text-muted-foreground">
                      Taxas de abertura, cliques e conversões
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Especificações Técnicas
              </CardTitle>
              <CardDescription>
                Tecnologias e integrações que serão utilizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Provedor SMTP</span>
                  </div>
                  <Badge variant="outline">AWS SES / SendGrid</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Edge Functions</span>
                  </div>
                  <Badge variant="outline">Supabase</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Code className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Templates Engine</span>
                  </div>
                  <Badge variant="outline">React Email</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Fila de Envios</span>
                  </div>
                  <Badge variant="outline">Redis / PostgreSQL</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Cronograma de Desenvolvimento
            </CardTitle>
            <CardDescription>
              Estimativa de implementação baseada na abordagem modular
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center p-6 rounded-lg bg-primary/5 border border-primary/20">
                <h3 className="text-lg font-semibold text-primary mb-2">
                  Por que o Sistema de E-mail é o Último?
                </h3>
                <p className="text-muted-foreground">
                  O sistema de e-mail é mais complexo pois depende de integrações externas, 
                  configurações de deliverabilidade e compliance com regulamentações. 
                  Desenvolver os outros sistemas primeiro permite criar uma base sólida 
                  e compreender melhor as necessidades de comunicação da plataforma.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-muted-foreground">Fase 1</div>
                  <h4 className="font-semibold">Sistemas Base</h4>
                  <p className="text-sm text-muted-foreground">
                    Autenticação, Gastos, Cofre e Analytics
                  </p>
                  <Badge className="bg-success/10 text-success">Em Andamento</Badge>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-primary">Fase 2</div>
                  <h4 className="font-semibold">Integração Backend</h4>
                  <p className="text-sm text-muted-foreground">
                    APIs, webhooks e edge functions
                  </p>
                  <Badge className="bg-warning/10 text-warning">Próximo</Badge>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-muted-foreground">Fase 3</div>
                  <h4 className="font-semibold">Sistema de E-mail</h4>
                  <p className="text-sm text-muted-foreground">
                    Interface completa e funcionalidades
                  </p>
                  <Badge variant="outline">Futuro</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
};

export default Email;