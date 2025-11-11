import * as bcrypt from 'bcrypt';
export class passwordManager {
  async encriptPaswoord(pass: string) {
    try {
      const saltRounds = 10;
      const hashedPassword = bcrypt.hashSync(pass, saltRounds);
      return hashedPassword;
    } catch (error) {
      console.error('Error al hashear la contraseña:', error);
      throw new Error('Error al hashear la contraseña');
    }
  }

  verifyPassword(password: string, hashedPassword: string) {
    const isPasword = bcrypt.compareSync(password, hashedPassword);
    return isPasword;
  }
}
