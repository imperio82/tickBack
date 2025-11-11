import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de CORS para permitir cualquier origen
  app.enableCors({
    origin: true, // Permite cualquier origen
    credentials: true, // Permite cookies y autenticación
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: '*',
  });

  app.setGlobalPrefix("api")
  
    const config = new DocumentBuilder()
    .setTitle('Mi API')
    .setDescription('Documentación de la API con Swagger')
    .setVersion('1.0')
    .addBearerAuth() // 🔑 Para usar JWT en Swagger
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
