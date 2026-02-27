{
  description = "Bun + Vite + Playwright + Pre-commit multi-platform dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    git-hooks.url = "github:cachix/git-hooks.nix";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      git-hooks,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        preCommit = git-hooks.lib.${system}.run {
          src = ./.;
          hooks = {
            # Secret scanning
            trufflehog.enable = true;
            ripsecrets.enable = true;

            # Hygiene
            nixfmt.enable = true;
            end-of-file-fixer.enable = true;
            trim-trailing-whitespace.enable = true;
          };
        };
      in
      {
        checks.pre-commit-check = preCommit;

        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.bun
            pkgs.chromium
          ]
          ++ preCommit.enabledPackages;

          shellHook = ''
            ${preCommit.shellHook}

            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
            export PLAYWRIGHT_CHROMIUM_PATH=${pkgs.chromium}/bin/chromium
            export PLAYWRIGHT_BROWSERS_PATH=0
          '';
        };
      }
    );
}
