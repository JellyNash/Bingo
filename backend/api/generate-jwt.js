#!/usr/bin/env node
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'dev_only_replace_me';
const token = jwt.sign({ sub: 'host', role: 'host' }, secret, { expiresIn: '1h' });
console.log(token);