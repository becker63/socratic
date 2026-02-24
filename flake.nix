{
  description = "Platform-independent Bun + Vite dev shell with pre-commit hooks";

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

            # Nice hygiene
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
          ]
          ++ preCommit.enabledPackages;

          shellHook = ''
            ${preCommit.shellHook}
          '';
        };
      }
    );
}
