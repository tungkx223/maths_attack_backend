import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as morgan from 'morgan';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
  });
  const port = process.env.PORT || 3001;

  app.use(morgan('common'));
  await app.listen(port, () => {
    console.log(`App listen at port ${port}`);
  });
}
bootstrap();
