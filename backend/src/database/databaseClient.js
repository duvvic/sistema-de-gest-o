import { supabaseAdapter } from './supabaseAdapter.js';

export const dbFindAll = async (table, query) => supabaseAdapter.findAll(table, query);
export const dbFindById = async (table, id, query) => supabaseAdapter.findById(table, id, query);
export const dbInsert = async (table, data, options) => supabaseAdapter.insert(table, data, options);
export const dbUpdate = async (table, id, data, options) => supabaseAdapter.update(table, id, data, options);
export const dbUpsert = async (table, data, options) => supabaseAdapter.upsert(table, data, options);
export const dbDelete = async (table, id) => supabaseAdapter.delete(table, id);
export const dbDeletePermanent = async (table, id) => supabaseAdapter.deletePermanent(table, id);
