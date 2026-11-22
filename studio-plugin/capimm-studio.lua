--!nocheck
-- capimm-studio • importa o código gerado pelo plugin capimm-figma
-- Instalar: crie um Script no Studio, cole este arquivo, clique com o botão direito
-- no Script → "Save as Local Plugin…". Reabra o Studio se o botão não aparecer.

local HttpService = game:GetService("HttpService")
local Selection = game:GetService("Selection")
local StarterGui = game:GetService("StarterGui")
local History = game:GetService("ChangeHistoryService")

local PREFIX = "CAPIMM1"
local GREEN, DARK, PANEL, LINE, TEXT, MUTED = Color3.fromRGB(46, 204, 113), Color3.fromRGB(15, 16, 22), Color3.fromRGB(25, 27, 37), Color3.fromRGB(44, 47, 63), Color3.fromRGB(238, 240, 248), Color3.fromRGB(143, 148, 171)

---------------------------------------------------------------- construtor
local function c3(c) return Color3.new(c.r, c.g, c.b) end

local function build(n, parent, order)
	local inst
	local rbx = n.rbx
	if rbx == "textLabel" or rbx == "textBox" then
		inst = Instance.new(rbx == "textBox" and "TextBox" or "TextLabel")
		inst.Text = n.text or ""
		inst.TextSize = n.fontSize or 18
		inst.Font = Enum.Font.FredokaOne
		inst.TextColor3 = c3(n.textColor)
		inst.BackgroundTransparency = 1
		inst.TextWrapped = true
		inst.TextXAlignment = (n.align == "CENTER" and Enum.TextXAlignment.Center) or (n.align == "RIGHT" and Enum.TextXAlignment.Right) or Enum.TextXAlignment.Left
		inst.TextYAlignment = Enum.TextYAlignment.Center
	else
		if rbx == "imageButton" then
			inst = Instance.new("ImageButton")
			inst.AutoButtonColor = false
		elseif rbx == "imageLabel" then
			inst = Instance.new("ImageLabel")
		elseif rbx == "scrollingFrame" then
			inst = Instance.new("ScrollingFrame")
			inst.CanvasSize = UDim2.new()
			inst.AutomaticCanvasSize = Enum.AutomaticSize.Y
			inst.ScrollBarThickness = 6
		else
			inst = Instance.new("Frame")
		end
		if n.fill and n.fill.color then
			inst.BackgroundColor3 = c3(n.fill.color)
			inst.BackgroundTransparency = 1 - (n.fill.opacity or 1)
		else
			inst.BackgroundTransparency = 1
		end
		if n.asset and (inst:IsA("ImageLabel") or inst:IsA("ImageButton")) then
			inst.BackgroundTransparency = 1
			local id = n.assetId
			if id then inst.Image = id end
		end
		if n.fill and n.fill.stops then
			local kps = {}
			for _, s in ipairs(n.fill.stops) do
				table.insert(kps, ColorSequenceKeypoint.new(math.clamp(s.pos, 0, 1), c3(s.color)))
			end
			if #kps >= 2 then
				local g = Instance.new("UIGradient")
				g.Color = ColorSequence.new(kps)
				g.Rotation = 90
				g.Parent = inst
			end
		end
		if n.radius and n.radius > 0 then
			local c = Instance.new("UICorner")
			c.CornerRadius = UDim.new(0, n.radius)
			c.Parent = inst
		end
	end
	if n.stroke then
		local s = Instance.new("UIStroke")
		s.Color = c3(n.stroke.color)
		s.Thickness = n.stroke.weight
		s.Parent = inst
	end
	inst.Name = n.name
	inst.BorderSizePixel = 0
	inst.AnchorPoint = Vector2.new(0, 0)
	inst.Position = UDim2.fromOffset(n.x, n.y)
	inst.Size = UDim2.fromOffset(n.w, n.h)
	inst.Visible = n.visible ~= false
	inst.ZIndex = order
	-- animações e sons ficam como atributos para você usar nos seus scripts
	if n.fx then inst:SetAttribute("CapimmFx", HttpService:JSONEncode(n.fx)) end
	if n.sound then
		inst:SetAttribute("ClickSoundId", n.sound.id)
		inst:SetAttribute("ClickSoundVolume", n.sound.volume)
	end
	inst.Parent = parent
	for i, ch in ipairs(n.children or {}) do build(ch, inst, i) end
	return inst
end

local function resolveAssets(nodes, assets)
	for _, n in ipairs(nodes) do
		if n.asset and assets[n.asset] then n.assetId = assets[n.asset] end
		if n.children then resolveAssets(n.children, assets) end
	end
end

---------------------------------------------------------------- interface
local toolbar = plugin:CreateToolbar("capimm")
local button = toolbar:CreateButton("capimm-figma", "Importar UI do Figma", "rbxasset://textures/ui/GuiImagePlaceholder.png")
button.ClickableWhenViewportHidden = true
local widget = plugin:CreateDockWidgetPluginGui("capimm_figma_import", DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Right, false, false, 380, 560, 320, 420))
widget.Title = "capimm-figma"

local root = Instance.new("Frame")
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = DARK
root.BorderSizePixel = 0
root.Parent = widget
local pad = Instance.new("UIPadding")
pad.PaddingTop, pad.PaddingBottom, pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 12), UDim.new(0, 12), UDim.new(0, 12), UDim.new(0, 12)
pad.Parent = root
local list = Instance.new("UIListLayout")
list.Padding = UDim.new(0, 8)
list.SortOrder = Enum.SortOrder.LayoutOrder
list.Parent = root

local order = 0
local function nextOrder() order += 1 return order end
local function label(text, size, color, bold)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Size = UDim2.new(1, 0, 0, size + 6)
	l.Text = text
	l.TextSize = size
	l.TextColor3 = color or TEXT
	l.Font = bold and Enum.Font.GothamBold or Enum.Font.Gotham
	l.TextXAlignment = Enum.TextXAlignment.Left
	l.TextWrapped = true
	l.LayoutOrder = nextOrder()
	l.Parent = root
	return l
end
local function styled(inst, h)
	inst.Size = UDim2.new(1, 0, 0, h)
	inst.BackgroundColor3 = PANEL
	inst.LayoutOrder = nextOrder()
	local c = Instance.new("UICorner") c.CornerRadius = UDim.new(0, 8) c.Parent = inst
	local s = Instance.new("UIStroke") s.Color = LINE s.Thickness = 1.5 s.Parent = inst
	inst.Parent = root
	return inst
end
local function mkButton(text, h, primary)
	local b = styled(Instance.new("TextButton"), h)
	b.Text = text
	b.Font = Enum.Font.GothamBold
	b.TextSize = 14
	b.AutoButtonColor = true
	b.TextColor3 = primary and Color3.new(1, 1, 1) or TEXT
	if primary then b.BackgroundColor3 = GREEN end
	return b
end

local title = label("capimm-figma  →  Studio", 18, TEXT, true)
label("Cole o código copiado no plugin do Figma e escolha o destino.", 12, MUTED)

local box = styled(Instance.new("TextBox"), 150)
box.MultiLine = true
box.ClearTextOnFocus = false
box.TextWrapped = false
box.TextXAlignment = Enum.TextXAlignment.Left
box.TextYAlignment = Enum.TextYAlignment.Top
box.Font = Enum.Font.Code
box.TextSize = 12
box.TextColor3 = TEXT
box.PlaceholderText = "CAPIMM1{...}"
box.PlaceholderColor3 = MUTED
box.Text = ""
box.ClipsDescendants = true

local mode = "selected" -- "selected" | "new"
local paintMode = function() end
local modeRow = Instance.new("Frame")
modeRow.BackgroundTransparency = 1
modeRow.Size = UDim2.new(1, 0, 0, 34)
modeRow.LayoutOrder = nextOrder()
modeRow.Parent = root
local rowLayout = Instance.new("UIListLayout")
rowLayout.FillDirection = Enum.FillDirection.Horizontal
rowLayout.Padding = UDim.new(0, 8)
rowLayout.Parent = modeRow
local function modeBtn(text, value)
	local b = Instance.new("TextButton")
	b.Size = UDim2.new(0.5, -4, 1, 0)
	b.Text = text
	b.Font = Enum.Font.GothamBold
	b.TextSize = 13
	b.TextColor3 = TEXT
	b.BackgroundColor3 = PANEL
	local c = Instance.new("UICorner") c.CornerRadius = UDim.new(0, 8) c.Parent = b
	local s = Instance.new("UIStroke") s.Color = LINE s.Thickness = 1.5 s.Parent = b
	b.Parent = modeRow
	b.Activated:Connect(function() mode = value paintMode() end)
	return b, s
end
local bSel, sSel = modeBtn("ScreenGui selecionada", "selected")
local bNew, sNew = modeBtn("Criar nova ScreenGui", "new")
paintMode = function()
	sSel.Color = mode == "selected" and GREEN or LINE
	sNew.Color = mode == "new" and GREEN or LINE
end
paintMode()

local nameBox = styled(Instance.new("TextBox"), 32)
nameBox.Text = "capimm_ui"
nameBox.PlaceholderText = "Nome da nova ScreenGui"
nameBox.PlaceholderColor3 = MUTED
nameBox.TextColor3 = TEXT
nameBox.Font = Enum.Font.Gotham
nameBox.TextSize = 13
nameBox.ClearTextOnFocus = false

local rootIsScreen = false
local chk = mkButton("☐  A raiz é a tela (importar só o que está dentro)", 32)
chk.TextSize = 12
chk.Activated:Connect(function()
	rootIsScreen = not rootIsScreen
	chk.Text = (rootIsScreen and "☑" or "☐") .. "  A raiz é a tela (importar só o que está dentro)"
end)

local go = mkButton("Importar", 40, true)
local status = label("", 12, MUTED)

local function say(text, ok)
	status.Text = text
	status.TextColor3 = ok == nil and MUTED or (ok and GREEN or Color3.fromRGB(231, 76, 60))
end

---------------------------------------------------------------- importar
local function import()
	local raw = (box.Text or ""):gsub("%s+", "")
	if raw:sub(1, #PREFIX) ~= PREFIX then return say("Código inválido: deve começar com " .. PREFIX, false) end
	local ok, data = pcall(HttpService.JSONDecode, HttpService, raw:sub(#PREFIX + 1))
	if not ok or type(data) ~= "table" or not data.roots then return say("Não consegui ler o código (JSON corrompido ou cortado).", false) end

	local target
	if mode == "selected" then
		target = Selection:Get()[1]
		if not target or not (target:IsA("LayerCollector") or target:IsA("GuiObject")) then
			return say("Selecione uma ScreenGui (ou Frame) no Explorer, ou use 'Criar nova'.", false)
		end
	end

	local _, rec = pcall(function() return History:TryBeginRecording("capimm import") end)
	local okBuild, err = pcall(function()
		if mode == "new" then
			target = Instance.new("ScreenGui")
			target.Name = (nameBox.Text ~= "" and nameBox.Text) or "capimm_ui"
			target.ResetOnSpawn = false
			target.IgnoreGuiInset = true -- coordenadas iguais às do Figma (começam no canto da tela)
			target.Parent = StarterGui
		end
		resolveAssets(data.roots, data.assets or {})
		local roots = data.roots
		if rootIsScreen and #roots == 1 and roots[1].children then
			for i, ch in ipairs(roots[1].children) do build(ch, target, i) end
		else
			for i, r in ipairs(roots) do build(r, target, i) end
		end
	end)
	if rec then History:FinishRecording(rec, okBuild and Enum.FinishRecordingOperation.Commit or Enum.FinishRecordingOperation.Cancel) end
	if not okBuild then return say("Erro ao montar: " .. tostring(err), false) end
	Selection:Set({ target })
	say("Pronto! UI importada em " .. target:GetFullName() .. ". Imagens podem levar alguns segundos para carregar (moderação do Roblox).", true)
end
go.Activated:Connect(import)
button.Click:Connect(function() widget.Enabled = not widget.Enabled end)
