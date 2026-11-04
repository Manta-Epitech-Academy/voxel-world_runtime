-- Ce que le code de l'élève trouve déjà défini : le monde, les fonctions
-- bloc / lire / bruit / bruit3d / hasard / afficher, et les constantes.
-- Exécuté dans wasmoon (worker.js) avant le code de l'élève, qui tourne
-- ensuite dans le même environnement global.
--
-- Fournis par le worker avant ce fichier : TAILLE, HAUTEUR, GRAINE, les
-- constantes de bloc (AIR = 0, SOCLE = 1, …), __NB_BLOCS, __DECALAGE,
-- __code, __limite, et la fonction __afficher.

local floor, type, error, tostring = math.floor, type, error, tostring
local TX, TY = TAILLE, HAUTEUR
local VALIDE = {}
for i = 0, __NB_BLOCS - 1 do VALIDE[i] = true end

-- Le monde : une case par bloc, en ligne, x le plus rapide, puis z, puis y.
local M = {}
for i = 1, TX * TX * TY do M[i] = 0 end
__hors_monde = 0

function bloc(x, y, z, b)
  if type(x) ~= "number" or type(y) ~= "number" or type(z) ~= "number" then
    error("bloc a besoin de trois nombres x, y, z, puis du type de bloc", 2)
  end
  if not VALIDE[b] then
    if b == nil then error("bloc : il manque le type de bloc, par exemple bloc(x, y, z, PIERRE)", 2) end
    if type(b) == "string" then
      error('bloc : "' .. b .. '" est un texte. Écris le nom du bloc en majuscules, sans guillemets : ' .. b:upper(), 2)
    end
    error("bloc : " .. tostring(b) .. " n'est pas un type de bloc (essaie PIERRE, HERBE, TERRE…)", 2)
  end
  x, y, z = floor(x), floor(y), floor(z)
  if x < 0 or x >= TX or z < 0 or z >= TX or y < 0 or y >= TY then
    __hors_monde = __hors_monde + 1
    return
  end
  M[x + TX * (z + TX * y) + 1] = b
end

function lire(x, y, z)
  if type(x) ~= "number" or type(y) ~= "number" or type(z) ~= "number" then
    error("lire a besoin de trois nombres x, y, z", 2)
  end
  x, y, z = floor(x), floor(y), floor(z)
  if x < 0 or x >= TX or z < 0 or z >= TX or y < 0 or y >= TY then return AIR end
  return M[x + TX * (z + TX * y) + 1]
end

-- Bruit de Perlin (Ken Perlin, version améliorée de 2002), permutation tirée de GRAINE.
local p = {}
math.randomseed(GRAINE)
for i = 0, 255 do p[i] = i end
for i = 255, 1, -1 do
  local j = math.random(0, i)
  p[i], p[j] = p[j], p[i]
end
for i = 0, 255 do p[i + 256] = p[i] end

local function fondu(t) return t * t * t * (t * (t * 6 - 15) + 10) end

local function grad2(h, x, y)
  h = h % 8
  if h == 0 then return x + y elseif h == 1 then return -x + y
  elseif h == 2 then return x - y elseif h == 3 then return -x - y
  elseif h == 4 then return x elseif h == 5 then return -x
  elseif h == 6 then return y else return -y end
end

local function interp(t, a, b) return a + t * (b - a) end

local function grad3(h, x, y, z)
  h = h % 16
  local u = h < 8 and x or y
  local v = h < 4 and y or ((h == 12 or h == 14) and x or z)
  return ((h % 2 == 0) and u or -u) + ((h % 4 < 2) and v or -v)
end

-- Compteurs lus par les vérifications : bruit est-il utilisé, et avec des entiers ?
local n_bruit, n_bruit_entier, n_bruit3d = 0, 0, 0

function bruit(x, z)
  if type(x) ~= "number" or type(z) ~= "number" then
    error("bruit a besoin de deux nombres : bruit(x, z)", 2)
  end
  n_bruit = n_bruit + 1
  if x == floor(x) and z == floor(z) then n_bruit_entier = n_bruit_entier + 1 end
  local fx, fz = floor(x), floor(z)
  local X, Z = fx % 256, fz % 256
  x, z = x - fx, z - fz
  local u, v = fondu(x), fondu(z)
  local a, b = p[X] + Z, p[X + 1] + Z
  local n00, n01 = grad2(p[a], x, z), grad2(p[a + 1], x, z - 1)
  local n10, n11 = grad2(p[b], x - 1, z), grad2(p[b + 1], x - 1, z - 1)
  local nx0 = n00 + u * (n10 - n00)
  local nx1 = n01 + u * (n11 - n01)
  return nx0 + v * (nx1 - nx0)
end

function bruit3d(x, y, z)
  if type(x) ~= "number" or type(y) ~= "number" or type(z) ~= "number" then
    error("bruit3d a besoin de trois nombres : bruit3d(x, y, z)", 2)
  end
  n_bruit3d = n_bruit3d + 1
  local fx, fy, fz = floor(x), floor(y), floor(z)
  local X, Y, Z = fx % 256, fy % 256, fz % 256
  x, y, z = x - fx, y - fy, z - fz
  local u, v, w = fondu(x), fondu(y), fondu(z)
  local A, B = p[X] + Y, p[X + 1] + Y
  local AA, AB, BA, BB = p[A] + Z, p[A + 1] + Z, p[B] + Z, p[B + 1] + Z
  local l = interp
  return l(w,
    l(v, l(u, grad3(p[AA], x, y, z), grad3(p[BA], x - 1, y, z)),
         l(u, grad3(p[AB], x, y - 1, z), grad3(p[BB], x - 1, y - 1, z))),
    l(v, l(u, grad3(p[AA + 1], x, y, z - 1), grad3(p[BA + 1], x - 1, y, z - 1)),
         l(u, grad3(p[AB + 1], x, y - 1, z - 1), grad3(p[BB + 1], x - 1, y - 1, z - 1))))
end

function hasard(a, b)
  if a == nil then return math.random() end
  if b == nil then return math.random(1, floor(a)) end
  return math.random(floor(a), floor(b))
end

function afficher(...)
  local n = select("#", ...)
  local morceaux = {}
  for i = 1, n do morceaux[i] = tostring((select(i, ...))) end
  __afficher(table.concat(morceaux, "  "))
end
print = afficher

-- Compile et exécute le code de l'élève. Renvoie "ok", "syntaxe" ou
-- "execution", le message, et la trace. Un code qui tourne plus de __limite
-- secondes est arrêté par le hook, avec la ligne où il en était.
function __lancer()
  local fn, err = load(__code, "=code", "t", _ENV)
  if not fn then return "syntaxe", err, "" end
  math.randomseed(GRAINE)
  local debut = os.clock()
  debug.sethook(function()
    if os.clock() - debut > __limite then error("__TEMPS_DEPASSE__", 2) end
  end, "", 20000)
  local trace = ""
  local ok, e = xpcall(fn, function(m)
    trace = debug.traceback("", 2)
    return tostring(m)
  end)
  debug.sethook()
  if ok then return "ok", "", "" end
  return "execution", e, trace
end

-- Le monde, en une chaîne d'un caractère par case (le type de bloc plus
-- __DECALAGE, pour rester dans des caractères imprimables). Par paquets de
-- 4096 : string.char n'accepte pas un million d'arguments d'un coup.
function __exporter()
  __n_bruit, __n_bruit_entier, __n_bruit3d = n_bruit, n_bruit_entier, n_bruit3d
  local char, unpack, morceaux, tampon = string.char, table.unpack, {}, {}
  local n = #M
  for i = 1, n, 4096 do
    for k = 0, 4095 do tampon[k + 1] = M[i + k] + __DECALAGE end
    morceaux[#morceaux + 1] = char(unpack(tampon, 1, 4096))
  end
  return table.concat(morceaux)
end
